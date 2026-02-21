"use server";

import { db } from "@/db";
import { members, stores, profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
import { z } from "zod";

const inviteMemberSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  role: z.enum(["manager", "seller"]),
  defaultStoreId: z.string().optional(),
});

export async function updateMemberStore(memberId: string, newStoreId: string) {
  const session = await getUserSession();

  if (!session) {
    return { error: "Não autorizado" };
  }

  // Apenas Dono ou Gerente podem alterar a loja de um funcionário
  if (!["owner", "manager"].includes(session.role)) {
    return { error: "Apenas donos e gerentes podem transferir funcionários." };
  }

  try {
    // Verificar se o membro pertence à mesma organização
    const [targetMember] = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, memberId),
          eq(members.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!targetMember) {
      return { error: "Funcionário não encontrado." };
    }

    // Verificar se a nova loja pertence à mesma organização
    const [targetStore] = await db
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.id, newStoreId),
          eq(stores.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!targetStore) {
      return { error: "Loja de destino inválida." };
    }

    // Atualizar a loja do membro
    await db
      .update(members)
      .set({ defaultStoreId: newStoreId })
      .where(eq(members.id, memberId));

    revalidatePath("/team");
    return { success: true, message: "Funcionário transferido com sucesso!" };
  } catch (error) {
    console.error("Erro ao transferir funcionário:", error);
    return { error: "Erro ao transferir funcionário. Tente novamente." };
  }
}

export async function inviteMember(data: z.infer<typeof inviteMemberSchema>) {
  const session = await getUserSession();

  if (!session || !["owner", "manager"].includes(session.role)) {
    return { error: "Apenas donos e gerentes podem convidar membros." };
  }

  const validated = inviteMemberSchema.safeParse(data);
  if (!validated.success) {
    return { error: "Dados inválidos." };
  }

  const { name, email, role, defaultStoreId } = validated.data;

  try {
    // Verificar se já existe membro com esse email na organização
    const existingMember = await db.query.members.findFirst({
      where: and(
        eq(members.email, email),
        eq(members.organizationId, session.organizationId)
      ),
    });

    if (existingMember) {
      return { error: "Este e-mail já é membro da equipe." };
    }

    const supabaseAdmin = createAdminClient();

    // Tenta convidar o usuário (envia email se configurado, ou apenas cria)
    // Se o usuário já existe no Auth (outra org), inviteUserByEmail pode falhar ou apenas retornar o user.
    // Aqui assumimos fluxo simples: criar usuário e mandar link de reset de senha ou magic link.
    // Para simplificar e evitar erros de "user already exists", vamos tentar inviteUserByEmail.
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
    });

    if (authError) {
      console.error("Erro ao convidar usuário Supabase:", authError);
      return { error: "Erro ao enviar convite. Verifique o e-mail." };
    }

    const userId = authData.user.id;

    // Criar perfil se não existir
    await db
      .insert(profiles)
      .values({
        id: userId,
        name,
        email,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: { name }, // Atualiza nome se já existir
      });

    // Adicionar à tabela members
    await db.insert(members).values({
      organizationId: session.organizationId,
      userId,
      email,
      role,
      defaultStoreId: defaultStoreId || null,
    });

    revalidatePath("/team");
    return { success: true, message: "Convite enviado com sucesso!" };
  } catch (error) {
    console.error("Erro ao convidar membro:", error);
    return { error: "Erro ao processar convite." };
  }
}

export async function deleteMember(memberId: string) {
  const session = await getUserSession();

  if (!session || !["owner", "manager"].includes(session.role)) {
    return { error: "Apenas donos e gerentes podem remover membros." };
  }

  try {
    const [memberToDelete] = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, memberId),
          eq(members.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!memberToDelete) {
      return { error: "Membro não encontrado." };
    }

    if (memberToDelete.role === "owner") {
      return { error: "Não é possível remover o dono da organização." };
    }

    if (memberToDelete.userId === session.user.id) {
      return { error: "Você não pode remover a si mesmo." };
    }

    // Remover da tabela members (o trigger ou cascade pode lidar com o resto, mas profiles fica)
    await db.delete(members).where(eq(members.id, memberId));

    // Opcional: Remover do Supabase Auth se ele não pertencer a mais nenhuma organização?
    // Por segurança, apenas removemos o acesso à organização atual (deletando de members).
    // O usuário continua existindo no Auth e Profiles, mas sem acesso aos dados desta org.
    
    // Se quiser deletar o usuário do Auth (cuidado se ele tiver outras contas):
    // const supabaseAdmin = createAdminClient();
    // await supabaseAdmin.auth.admin.deleteUser(memberToDelete.userId);

    revalidatePath("/team");
    return { success: true, message: "Membro removido com sucesso." };
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    return { error: "Erro ao remover membro." };
  }
}
