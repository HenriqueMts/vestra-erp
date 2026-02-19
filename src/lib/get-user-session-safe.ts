import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { members, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Versão segura de getUserSession que não redireciona.
 * Retorna null se não houver sessão ou organização, em vez de redirecionar.
 */
export async function getUserSessionSafe() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 1. Busca o perfil
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
    return null;
  }

  // 3. Obter status de cobrança
  const billingStatus = (member.organization.billingStatus ?? "active") as "active" | "overdue" | "suspended";
  
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
