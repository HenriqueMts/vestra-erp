"use server";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";
import { validateCNPJ } from "@/utils/validators";

/** Dados atuais da organização (para exibir no formulário de edição). */
export async function getOrganization() {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
    columns: { id: true, name: true, document: true, logoUrl: true },
  });

  if (!org) return { error: "Organização não encontrada." };
  return {
    name: org.name,
    document: org.document ?? "",
    logoUrl: org.logoUrl ?? null,
  };
}

function validateOrganizationUpdate(data: {
  name?: string;
  document?: string | null;
}): { error: string } | { name?: string; document?: string | null } {
  const name = data.name?.trim();
  const documentRaw = data.document === undefined ? undefined : (data.document ?? "").trim();
  const documentClean = documentRaw?.replaceAll(/\D/g, "") ?? "";

  if (name !== undefined && (!name || name.length < 2)) {
    return { error: "Razão social deve ter pelo menos 2 caracteres." };
  }
  if (documentClean.length > 0) {
    if (documentClean.length !== 14) return { error: "CNPJ deve ter 14 dígitos." };
    if (!validateCNPJ(documentClean)) return { error: "CNPJ inválido." };
  }

  const updates: { name?: string; document?: string | null } = {};
  if (name !== undefined) updates.name = name;
  if (data.document !== undefined) updates.document = documentClean || null;
  return updates;
}

/** Atualiza nome e/ou CNPJ da empresa. Apenas dono. */
export async function updateOrganization(data: {
  name?: string;
  document?: string | null;
}) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };
  if (session.role !== "owner") {
    return { error: "Apenas o dono da empresa pode alterar os dados da organização." };
  }

  const validated = validateOrganizationUpdate(data);
  if ("error" in validated) return validated;
  if (Object.keys(validated).length === 0) return { success: true };

  await db
    .update(organizations)
    .set(validated)
    .where(eq(organizations.id, session.organizationId));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/settings/invoice");

  return { success: true };
}
