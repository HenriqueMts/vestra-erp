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
  if (!isAsaasConfigured()) {
    return { 
      error: "Asaas não configurado. Verifique se ASAAS_API_KEY está no .env.local e reinicie o servidor Next.js." 
    };
  }

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

  const payload = {
    name: org.name,
    cpfCnpj: doc,
    email: email.trim(),
  };

  try {
    const res = await asaasFetch("/customers", {
      method: "POST",
      body: payload,
    });
    
    let data: { id?: string; errors?: Array<{ description: string }>; error?: string };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      const text = await res.text();
      console.error("Asaas response (not JSON):", text);
      return { error: `Erro ao criar cliente no Asaas (${res.status}). Verifique a chave de API.` };
    }

    if (!res.ok) {
      const msg = data.errors?.[0]?.description ?? data.error ?? `Erro ao criar cliente no Asaas (${res.status}).`;
      console.error("Asaas API error:", { status: res.status, data });
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

/** Retorna a próxima data de vencimento no formato YYYY-MM-DD (dia do mês entre 1 e 28). */
function getNextDueDate(billingDay: number): string {
  const day = Math.max(1, Math.min(28, Math.floor(billingDay)));
  const now = new Date();
  let next = new Date(now.getFullYear(), now.getMonth(), day);
  if (next <= now) {
    next = new Date(now.getFullYear(), now.getMonth() + 1, day);
  }
  return next.toISOString().slice(0, 10);
}

/** Cria ou atualiza a assinatura (plano) no Asaas para a organização. Valor em reais, dia 1–28. Apenas admin. */
export async function createOrUpdateSubscription(
  organizationId: string,
  valueReais: number,
  billingDay: number
) {
  const session = await getUserSession();
  if (!session?.user?.email) return { error: "Não autorizado" };
  if (!isPlatformAdmin(session.user.email)) {
    return { error: "Apenas o administrador da plataforma pode definir planos." };
  }
  if (!isAsaasConfigured()) {
    return { error: "Asaas não configurado. Defina ASAAS_API_KEY no servidor." };
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { id: true, name: true, asaasCustomerId: true, asaasSubscriptionId: true },
  });

  if (!org) return { error: "Organização não encontrada." };
  if (!org.asaasCustomerId) {
    return { error: "Cadastre a organização no Asaas antes de definir o plano." };
  }

  const value = Math.max(0, Number(valueReais));
  const day = Math.max(1, Math.min(28, Math.floor(billingDay)));
  const valueCents = Math.round(value * 100);

  if (value <= 0) return { error: "Informe um valor maior que zero." };

  const nextDueDate = getNextDueDate(day);

  try {
    if (org.asaasSubscriptionId) {
      // Atualizar assinatura existente
      const res = await asaasFetch(`/subscriptions/${org.asaasSubscriptionId}`, {
        method: "PUT",
        body: {
          value,
          billingType: "BOLETO",
          nextDueDate,
          cycle: "MONTHLY",
          description: `Vestra - ${org.name}`,
          updatePendingPayments: true,
        },
      });
      const data = (await res.json()) as { id?: string; errors?: Array<{ description: string }> };

      if (!res.ok) {
        const msg = data.errors?.[0]?.description ?? "Erro ao atualizar assinatura no Asaas.";
        return { error: msg };
      }

      await db
        .update(organizations)
        .set({
          planValueCents: valueCents,
          planBillingDay: day,
        })
        .where(eq(organizations.id, organizationId));
    } else {
      // Criar nova assinatura
      const res = await asaasFetch("/subscriptions", {
        method: "POST",
        body: {
          customer: org.asaasCustomerId,
          billingType: "BOLETO",
          nextDueDate,
          value,
          cycle: "MONTHLY",
          description: `Vestra - ${org.name}`,
        },
      });
      const data = (await res.json()) as { id?: string; errors?: Array<{ description: string }> };

      if (!res.ok) {
        const msg = data.errors?.[0]?.description ?? "Erro ao criar assinatura no Asaas.";
        return { error: msg };
      }

      const subscriptionId = data.id;
      if (!subscriptionId) return { error: "Asaas não retornou o ID da assinatura." };

      await db
        .update(organizations)
        .set({
          asaasSubscriptionId: String(subscriptionId),
          planValueCents: valueCents,
          planBillingDay: day,
        })
        .where(eq(organizations.id, organizationId));
    }

    revalidatePath("/minha-conta");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("createOrUpdateSubscription:", err);
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
