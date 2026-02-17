"use server";

import { db } from "@/db";
import { organizations, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { asaasFetch, isAsaasConfigured } from "@/lib/asaas";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { revalidatePath } from "next/cache";

/** Lista todas as organizações (clientes Vestra) com status Asaas. Apenas admin da plataforma. */
export async function listOrganizationsForAdmin() {
  const session = await getUserSession();
  if (!session?.user?.email) return { error: "Não autorizado" };
  if (!isPlatformAdmin(session.user.email)) {
    return { error: "Apenas o administrador da plataforma pode acessar esta lista." };
  }

  const orgs = await db.query.organizations.findMany({
    columns: {
      id: true,
      name: true,
      document: true,
      slug: true,
      asaasCustomerId: true,
      asaasSubscriptionId: true,
      planValueCents: true,
      planBillingDay: true,
    },
    orderBy: (o, { asc }) => [asc(o.name)],
  });

  const ownerEmails = await db
    .select({
      organizationId: members.organizationId,
      email: members.email,
    })
    .from(members)
    .where(eq(members.role, "owner"));

  const emailByOrg = Object.fromEntries(ownerEmails.map((r) => [r.organizationId, r.email]));

  return {
    organizations: orgs.map((org) => ({
      id: org.id,
      name: org.name,
      document: org.document ?? "",
      slug: org.slug,
      asaasCustomerId: org.asaasCustomerId ?? null,
      asaasSubscriptionId: org.asaasSubscriptionId ?? null,
      planValueCents: org.planValueCents ?? null,
      planBillingDay: org.planBillingDay ?? null,
      ownerEmail: emailByOrg[org.id] ?? null,
    })),
  };
}

/** Cadastra a organização como cliente no Asaas (sua conta). Apenas admin. */
export async function createAsaasCustomer(organizationId: string) {
  const session = await getUserSession();
  if (!session?.user?.email) return { error: "Não autorizado" };
  if (!isPlatformAdmin(session.user.email)) {
    return { error: "Apenas o administrador da plataforma pode cadastrar clientes no Asaas." };
  }
  if (!isAsaasConfigured()) return { error: "Asaas não configurado. Defina ASAAS_API_KEY no servidor." };

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { id: true, name: true, document: true, asaasCustomerId: true },
  });

  if (!org) return { error: "Organização não encontrada." };
  if (org.asaasCustomerId) return { error: "Esta organização já está cadastrada no Asaas." };

  const doc = org.document?.replaceAll(/\D/g, "") ?? "";
  if (doc.length !== 11 && doc.length !== 14) {
    return { error: "Cadastre o CPF ou CNPJ da empresa em Configurações → Dados da empresa antes de enviar ao Asaas." };
  }

  const owner = await db.query.members.findFirst({
    where: eq(members.organizationId, organizationId),
    columns: { email: true },
  });
  const email = owner?.email ?? session.user.email;

  const body = {
    name: org.name,
    cpfCnpj: doc,
    email: email.trim(),
  };

  try {
    const res = await asaasFetch("/customers", { method: "POST", body });
    const data = (await res.json()) as { id?: string; errors?: Array<{ description: string }> };

    if (!res.ok) {
      const msg = data.errors?.[0]?.description ?? (typeof data === "object" && "error" in data ? String((data as { error: string }).error) : "Erro ao criar cliente no Asaas.");
      return { error: msg };
    }

    const customerId = data.id;
    if (!customerId) return { error: "Asaas não retornou o ID do cliente." };

    await db
      .update(organizations)
      .set({ asaasCustomerId: String(customerId) })
      .where(eq(organizations.id, organizationId));

    revalidatePath("/minha-conta");
    revalidatePath("/dashboard");
    return { success: true, asaasCustomerId: String(customerId) };
  } catch (err) {
    console.error("createAsaasCustomer:", err);
    return { error: "Falha ao comunicar com o Asaas. Tente novamente." };
  }
}

export type BillingPayment = {
  id: string;
  value: number;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string | null;
  description?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
};

/** Lista cobranças (faturas/boletos) da organização do usuário logado. Apenas a própria org. */
export async function listOrganizationPayments(organizationId: string) {
  const session = await getUserSession();
  if (!session?.user?.email) return { error: "Não autorizado" };
  if (session.organizationId !== organizationId) {
    return { error: "Você só pode ver as faturas da sua organização." };
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { asaasCustomerId: true },
  });

  if (!org?.asaasCustomerId) {
    return { payments: [], error: null };
  }

  if (!isAsaasConfigured()) {
    return { payments: [] as BillingPayment[], error: "Asaas não configurado." };
  }

  try {
    const res = await asaasFetch(
      `/payments?customer=${encodeURIComponent(org.asaasCustomerId)}&limit=50`
    );
    const data = (await res.json()) as {
      data?: Array<{
        id: string;
        value: number;
        billingType?: string;
        status?: string;
        dueDate?: string;
        paymentDate?: string | null;
        description?: string | null;
        invoiceUrl?: string | null;
        bankSlipUrl?: string | null;
      }>;
      errors?: Array<{ description: string }>;
    };

    if (!res.ok) {
      const msg = data.errors?.[0]?.description ?? "Erro ao listar cobranças.";
      return { payments: [] as BillingPayment[], error: msg };
    }

    const list = data.data ?? [];
    const payments: BillingPayment[] = list.map((p) => ({
      id: p.id,
      value: p.value,
      billingType: p.billingType ?? "",
      status: p.status ?? "",
      dueDate: p.dueDate ?? "",
      paymentDate: p.paymentDate ?? null,
      description: p.description ?? null,
      invoiceUrl: p.invoiceUrl ?? null,
      bankSlipUrl: p.bankSlipUrl ?? null,
    }));

    return { payments, error: null };
  } catch (err) {
    console.error("listOrganizationPayments:", err);
    return { payments: [] as BillingPayment[], error: "Falha ao comunicar com o Asaas." };
  }
}
