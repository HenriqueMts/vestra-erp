"use server";

import { eq, and } from "drizzle-orm";
import { createAdminClient } from "@/utils/supabase/admin";
import { db } from "@/db";
import { members, profiles } from "@/db/schema";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createMember(formData: FormData) {
  const session = await getUserSession();

  if (session.role !== "owner" && session.role !== "manager") {
    return { error: "Permissão negada." };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as "manager" | "seller";

  if (!name || !email) {
    return { error: "Preencha nome e e-mail." };
  }

  const supabaseAdmin = createAdminClient();
  const origin = (await headers()).get("origin");

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    });

  if (authError) {
    console.error("Erro ao convidar:", authError);
    return {
      error: "Erro ao enviar convite. Verifique se o e-mail já existe.",
    };
  }

  const newUserId = authData.user.id;

  try {
    await db.insert(profiles).values({
      id: newUserId,
      name,
      email,
      mustChangePassword: true,
    });

    await db.insert(members).values({
      organizationId: session.organizationId,
      userId: newUserId,
      role: role || "seller",
    });

    revalidatePath("/team");
    return { success: true };
  } catch (dbError) {
    console.error("Erro no banco:", dbError);

    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return { error: "Erro ao salvar dados do membro." };
  }
}

export async function deleteMember(targetUserId: string) {
  const session = await getUserSession();

  if (session.role !== "owner" && session.role !== "manager") {
    return { error: "Permissão negada." };
  }

  if (targetUserId === session.user.id) {
    return { error: "Você não pode remover a si mesmo." };
  }

  const targetMember = await db.query.members.findFirst({
    where: and(
      eq(members.userId, targetUserId),
      eq(members.organizationId, session.organizationId),
    ),
  });

  if (!targetMember) {
    return { error: "Membro não encontrado." };
  }

  if (targetMember.role === "owner") {
    return { error: "Não é possível remover o dono da empresa." };
  }

  const supabaseAdmin = createAdminClient();

  try {
    await db
      .delete(members)
      .where(
        and(
          eq(members.userId, targetUserId),
          eq(members.organizationId, session.organizationId),
        ),
      );

    // Deleta o perfil também (opcional, dependendo da sua regra de negócio)
    //await db.delete(profiles).where(eq(profiles.id, targetUserId));

    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (authError) {
      console.error("Erro ao deletar do Auth:", authError);
    }

    revalidatePath("/team");
    return { success: true };
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    return { error: "Erro ao remover membro do sistema." };
  }
}
