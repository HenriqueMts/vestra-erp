"use server";

import { db } from "@/db";
import { members, stores, profiles } from "@/db/schema"; // <--- ADICIONE PROFILES AQUI
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUserSession } from "@/lib/get-user-session";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// --- VALIDATION SCHEMA ---
const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["manager", "seller"]),
  defaultStoreId: z.string().optional(),
});

type InviteInput = z.infer<typeof inviteSchema>;

type ActionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Ocorreu um erro desconhecido.";
}

// Cliente Admin do Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// --- CONVIDAR MEMBRO ---
export async function inviteMember(data: InviteInput): Promise<ActionResponse> {
  const { user, organizationId } = await getUserSession();

  if (!user || !organizationId) {
    return { error: "Sessão inválida ou não autorizado." };
  }

  try {
    // 1. Verifica duplicidade
    const existing = await db.query.members.findFirst({
      where: and(
        eq(members.organizationId, organizationId),
        eq(members.email, data.email),
      ),
    });

    if (existing) {
      return { error: "Este e-mail já está cadastrado na equipe." };
    }

    // 2. Cria o usuário no Auth do Supabase e envia o e-mail
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: { name: data.name },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      });

    if (inviteError) {
      console.error("Erro Supabase Admin:", inviteError);
      return { error: `Erro ao enviar convite: ${inviteError.message}` };
    }

    if (!inviteData.user) {
      return { error: "Erro inesperado: Usuário não foi criado." };
    }

    // --- CORREÇÃO DO ERRO 23503 ---
    // 3. Garante que o Perfil existe na tabela public.profiles
    // Como o trigger pode não estar rodando, inserimos manualmente para evitar o erro de chave estrangeira.
    await db
      .insert(profiles)
      .values({
        id: inviteData.user.id, // O mesmo ID gerado pelo Auth
        name: data.name,
        email: data.email,
      })
      .onConflictDoNothing(); // Se o trigger funcionou e já criou, não faz nada.

    // 4. Agora sim, salva o membro vinculado
    await db.insert(members).values({
      organizationId,
      email: data.email,
      userId: inviteData.user.id,
      role: data.role,
      defaultStoreId: data.defaultStoreId || null,
    });

    revalidatePath("/team");
    return { success: true, message: "Convite enviado e membro adicionado!" };
  } catch (error) {
    console.error("Server Action Error (inviteMember):", error);
    return { error: getErrorMessage(error) };
  }
}

// --- REMOVER MEMBRO ---
export async function deleteMember(memberId: string): Promise<ActionResponse> {
  const { user, organizationId } = await getUserSession();

  if (!user || !organizationId) return { error: "Não autorizado." };

  try {
    const [memberToDelete] = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, memberId),
          eq(members.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!memberToDelete) {
      return { error: "Membro não encontrado." };
    }

    // Opcional: Remover o usuário do Auth também para limpar o banco
    if (memberToDelete.userId) {
      await supabaseAdmin.auth.admin.deleteUser(memberToDelete.userId);
      // Isso vai disparar um cascade delete se o banco estiver configurado,
      // ou podemos deletar manualmente o member abaixo.
    }

    await db.delete(members).where(eq(members.id, memberId));

    revalidatePath("/team");
    return { success: true, message: "Membro removido com sucesso." };
  } catch (error) {
    console.error("Erro delete:", error);
    const msg = getErrorMessage(error);
    if (msg.includes("violates foreign key")) {
      return {
        error: "Membro possui vendas vinculadas e não pode ser removido.",
      };
    }
    return { error: `Erro ao remover: ${msg}` };
  }
}

// --- LISTAR LOJAS ---
export async function getStoreOptions() {
  const { organizationId } = await getUserSession();
  if (!organizationId) return [];

  try {
    const result = await db.query.stores.findMany({
      where: eq(stores.organizationId, organizationId),
      columns: { id: true, name: true },
    });
    return result;
  } catch (error) {
    return [];
  }
}
