import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { members, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function getUserSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Busca o perfil (troca de senha obrigatória, nome, etc.). Se a query falhar (ex.: coluna inexistente), segue sem perfil.
  let profile: Awaited<ReturnType<typeof db.query.profiles.findFirst>> | null = null;
  try {
    profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });
  } catch {
    profile = null;
  }

  // 2. Busca os dados da organização (Membro)
  const member = await db.query.members.findFirst({
    where: eq(members.userId, user.id),
    with: {
      organization: true,
      store: true,
    },
  });

  if (!member) {
    redirect("/login?error=no_org");
  }

  // 3. Verificar status de cobrança e bloquear acesso se suspenso
  const billingStatus = member.organization.billingStatus ?? "active";
  if (billingStatus === "suspended") {
    // Redireciona para /minha-conta com mensagem de bloqueio
    redirect("/minha-conta?blocked=suspended");
  }

  return {
    user,
    profile,
    organizationId: member.organizationId,
    orgLogo: member.organization.logoUrl,
    orgName: member.organization.name,
    storeId: member.defaultStoreId,
    role: member.role,
    orgSlug: member.organization.slug,
    billingStatus,
    mustChangePassword: profile?.mustChangePassword || false,
  };
}
