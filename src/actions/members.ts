"use server";

import { db } from "@/db";
import { members, stores, profiles } from "@/db/schema"; // <--- ADICIONE PROFILES AQUI
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUserSession } from "@/lib/get-user-session";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

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

export async function inviteMember(data: InviteInput): Promise<ActionResponse> {
  const { user, organizationId } = await getUserSession();

  if (!user || !organizationId) {
    return { error: "Sessão inválida ou não autorizado." };
  }

  const originHeader = (await headers()).get("origin");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || originHeader || "http://localhost:3000";
  try {
    const existing = await db.query.members.findFirst({
      where: and(
        eq(members.organizationId, organizationId),
        eq(members.email, data.email),
      ),
    });

    if (existing) {
      return { error: "Este e-mail já está cadastrado na equipe." };
    }

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: { name: data.name },
        // Invite não suporta PKCE; tokens vêm no hash. Redirecionar para /login
// para o cliente processar o hash e enviar para /update-password quando type=invite.
redirectTo: `${baseUrl}/login`,
      });

    if (inviteError) {
      console.error("Erro Supabase Admin:", inviteError);
      return { error: `Erro ao enviar convite: ${inviteError.message}` };
    }

    if (!inviteData.user) {
      return { error: "Erro inesperado: Usuário não foi criado." };
    }

    await db
      .insert(profiles)
      .values({
        id: inviteData.user.id,
        name: data.name,
        email: data.email,
      })
      .onConflictDoNothing();

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

    if (memberToDelete.userId) {
      await supabaseAdmin.auth.admin.deleteUser(memberToDelete.userId);
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
