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

  // 1. Busca o perfil para ver se a troca de senha é obrigatória
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

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

  return {
    user,
    organizationId: member.organizationId,
    orgLogo: member.organization.logoUrl,
    orgName: member.organization.name,
    storeId: member.storeId,
    role: member.role,
    orgSlug: member.organization.slug,
    // Retornamos a flag para o Layout decidir se bloqueia ou não
    mustChangePassword: profile?.mustChangePassword || false,
  };
}
