// src/auth/utils.ts
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getCurrentOrg = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // 2. Busca a organização desse usuário no banco
  // Assumindo que o usuário só tem UMA organização ativa por enquanto (MVP)
  const [membership] = await db
    .select({
      organizationId: members.organizationId,
      role: members.role,
    })
    .from(members)
    .where(eq(members.userId, user.id))
    .limit(1);

  if (!membership) {
    console.error("Usuário sem organização:", user.id);
    redirect("/login?error=no_org");
  }

  return {
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  };
});
