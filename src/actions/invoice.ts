"use server";

import { db } from "@/db";
import { sales, invoiceSettings, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";

// --- Focus NFe (conta mestra Vestra, sub-contas por CNPJ) ---
const FOCUS_URL =
  process.env.FOCUS_ENV === "production"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";

function getFocusToken(): string | null {
  const env = process.env.FOCUS_ENV === "production" ? "production" : "homologation";
  const token =
    env === "production"
      ? process.env.FOCUS_NFE_TOKEN_PROD ?? process.env.FOCUS_NFE_TOKEN
      : process.env.FOCUS_NFE_TOKEN_HOMOLOG ?? process.env.FOCUS_NFE_TOKEN;
  return token?.trim() ?? null;
}

async function focusFetch(endpoint: string, options: RequestInit = {}) {
  const token = getFocusToken();
  if (!token) throw new Error("FOCUS_NFE_TOKEN não configurado");
  const headers: HeadersInit = {
    Authorization: `Basic ${Buffer.from(token + ":").toString("base64")}`,
    "Content-Type": "application/json",
    ...options.headers,
  };
  return fetch(`${FOCUS_URL}${endpoint}`, { ...options, headers });
}

/** Dados da empresa para o passo 3 do wizard (confirmar). */
export async function getOrganizationForInvoice() {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
    columns: { name: true, document: true },
  });

  if (!org) return { error: "Organização não encontrada." };
  return {
    name: org.name,
    document: org.document ?? "",
  };
}

/**
 * Cadastra a empresa na Focus (conta mestra Vestra). Chamar antes de enviar certificado/CSC.
 * Se a empresa já existir (422 empresa_ja_cadastrada), trata como sucesso.
 */
export async function registerCompanyInFocus(organizationId: string) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { name: true, document: true },
  });
  const cnpjClean = org?.document?.replaceAll(/\D/g, "") ?? "";
  if (!org || cnpjClean.length !== 14) {
    return { error: "CNPJ não encontrado. Cadastre o CNPJ da empresa em Configurações → Dados da empresa." };
  }

  const settings = await db.query.invoiceSettings.findFirst({
    where: eq(invoiceSettings.organizationId, organizationId),
  });
  const payload = {
    nome: org.name,
    cnpj: cnpjClean,
    inscricao_estadual: settings?.ie ?? "",
    inscricao_municipal: settings?.im ?? "",
    regime_tributario: settings?.regimeTributario ?? "1",
    ...(settings?.logradouro &&
      settings?.numero &&
      settings?.bairro &&
      settings?.municipio &&
      settings?.uf &&
      settings?.cep && {
        logradouro: settings.logradouro,
        numero: settings.numero,
        complemento: settings.complemento ?? "",
        bairro: settings.bairro,
        municipio: settings.municipio,
        uf: settings.uf,
        cep: settings.cep.replaceAll(/\D/g, ""),
      }),
  };

  try {
    const response = await focusFetch("/v2/empresas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) return { success: true };

    if (response.status === 422 && (data.codigo === "empresa_ja_cadastrada" || data.mensagem?.includes("já cadastrada"))) {
      return { success: true, message: "Empresa já vinculada." };
    }

    const msg = typeof data.mensagem === "string" ? data.mensagem : JSON.stringify(data);
    const hint =
      /endereço|obrigatório|required|inscrição/i.test(msg) ||
      (response.status === 400 || response.status === 422)
        ? " Preencha os dados fiscais (endereço, IE, IM) no passo 1 e tente novamente."
        : "";
    return { error: `Erro ao cadastrar na Focus: ${msg}${hint}` };
  } catch (err) {
    console.error("registerCompanyInFocus:", err);
    return { error: "Falha ao comunicar com a Focus. Tente novamente." };
  }
}

function mapPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    cash: "01",
    credit: "03",
    debit: "04",
    pix: "17",
  };
  return map[method] ?? "99";
}

export async function emitInvoice(saleId: string) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const sale = await db.query.sales.findFirst({
    where: and(
      eq(sales.id, saleId),
      eq(sales.organizationId, session.organizationId)
    ),
    with: {
      organization: {
        with: { invoiceSettings: true },
      },
      items: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              sku: true,
              ncm: true,
              origin: true,
              cfop: true,
              cest: true,
            },
          },
        },
      },
      client: {
        columns: {
          id: true,
          name: true,
          document: true,
          email: true,
        },
      },
    },
  });

  if (!sale) return { error: "Venda não encontrada" };

  const settings = sale.organization?.invoiceSettings ?? null;

  if (!settings?.isActive) {
    return { status: "skipped" as const, message: "Emissão fiscal desativada para esta empresa." };
  }

  if (!getFocusToken()) {
    return { error: "Integração fiscal não configurada. Contate o suporte Vestra." };
  }

  const ref = `vestra-${saleId.slice(0, 8)}`;

  const payload: Record<string, unknown> = {
    natureza_operacao: "Venda ao Consumidor",
    data_emissao: new Date().toISOString().slice(0, 19),
    tipo_documento: "1",
    finalidade_emissao: "1",
    consumidor_final: "1",
    presenca_comprador: "1",
    ...(settings.certificateId?.trim() && { certificado_id: settings.certificateId.trim() }),
    ...(settings.cscId?.trim() && settings.cscToken?.trim() && {
      csc: { id: Number(settings.cscId) || settings.cscId, codigo: settings.cscToken.trim() },
    }),
    cliente: sale.client
      ? {
          cpf_cnpj: sale.client.document?.replaceAll(/\D/g, "") ?? "",
          nome: sale.client.name,
          email: sale.client.email ?? undefined,
        }
      : undefined,
    itens: sale.items.map((item) => ({
      numero_item: sale.items.indexOf(item) + 1,
      codigo_produto: item.product?.sku ?? item.productId,
      descricao: item.product?.name ?? "Produto",
      ncm: item.product?.ncm ?? "00000000",
      origem: String(item.product?.origin ?? "0"),
      cfop: item.product?.cfop ?? "5102",
      cest: item.product?.cest ?? undefined,
      unidade_comercial: "UN",
      quantidade_comercial: item.quantity,
      valor_unitario_comercial: item.unitPriceCents / 100,
      valor_bruto: (item.quantity * item.unitPriceCents) / 100,
    })),
    valor_total: sale.totalCents / 100,
    forma_pagamento: [
      {
        forma_pagamento: mapPaymentMethod(sale.paymentMethod),
        valor_pago: sale.totalCents / 100,
      },
    ],
  };

  try {
    const response = await focusFetch(
      `/v2/nfce?ref=${encodeURIComponent(ref)}`,
      { method: "POST", body: JSON.stringify(payload) }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg =
        typeof data.mensagem === "string"
          ? data.mensagem
          : data.errors?.[0]?.mensagem ?? "Erro na SEFAZ";
      await db
        .update(sales)
        .set({
          invoiceStatus: "rejected",
          invoiceUrl: null,
          invoiceXml: null,
          invoiceNumber: null,
          invoiceSeries: null,
        })
        .where(eq(sales.id, saleId));
      return { error: msg };
    }

    const status = data.status ?? data.codigo_status;
    const authorized = status === "autorizado" || status === "authorized" || data.codigo_status === 100;

    if (authorized) {
      const danfeUrl =
        data.caminho_danfe_fe ?? data.url_danfe ?? data.link_danfe ?? data.danfe?.url;
      await db
        .update(sales)
        .set({
          invoiceStatus: "authorized",
          invoiceUrl: danfeUrl ?? null,
          invoiceXml: data.caminho_xml_nota_fiscal ?? data.url_xml ?? null,
          invoiceNumber: data.numero ?? data.nfce?.numero ?? null,
          invoiceSeries: data.serie ?? data.nfce?.serie ?? null,
        })
        .where(eq(sales.id, saleId));

      return {
        success: true,
        url: danfeUrl ?? undefined,
        numero: data.numero ?? data.nfce?.numero,
        serie: data.serie ?? data.nfce?.serie,
      };
    }

    await db
      .update(sales)
      .set({
        invoiceStatus: "rejected",
        invoiceUrl: null,
        invoiceNumber: null,
        invoiceSeries: null,
      })
      .where(eq(sales.id, saleId));

    return {
      error:
        typeof data.mensagem === "string"
          ? data.mensagem
          : "Nota não autorizada pela SEFAZ.",
    };
  } catch (err) {
    console.error("Erro na emissão NFC-e:", err);
    await db
      .update(sales)
      .set({
        invoiceStatus: "error",
        invoiceUrl: null,
        invoiceXml: null,
        invoiceNumber: null,
        invoiceSeries: null,
      })
      .where(eq(sales.id, saleId));
    return { error: "Falha na comunicação com a SEFAZ. Tente reemitir depois." };
  }
}

/** Retorna se a organização está com emissão de NFC-e ativa (para mostrar/ocultar seção fiscal no produto). */
export async function getInvoiceEnabled() {
  const session = await getUserSession();
  if (!session?.user?.id) return { enabled: false };

  const row = await db.query.invoiceSettings.findFirst({
    where: eq(invoiceSettings.organizationId, session.organizationId),
    columns: { isActive: true },
  });
  return { enabled: row?.isActive ?? false };
}

export async function getInvoiceSettings() {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const row = await db.query.invoiceSettings.findFirst({
    where: eq(invoiceSettings.organizationId, session.organizationId),
  });

  return {
    settings: row
      ? {
          isActive: row.isActive,
          environment: row.environment ?? "homologation",
          cscId: row.cscId ?? "",
          cscToken: row.cscToken ?? "",
          certificateId: row.certificateId ?? "",
          certificateStatus: row.certificateStatus ?? null,
          ie: row.ie ?? "",
          im: row.im ?? "",
          regimeTributario: row.regimeTributario ?? "1",
          cep: row.cep ?? "",
          logradouro: row.logradouro ?? "",
          numero: row.numero ?? "",
          complemento: row.complemento ?? "",
          bairro: row.bairro ?? "",
          municipio: row.municipio ?? "",
          uf: row.uf ?? "",
        }
      : null,
  };
}

/** Salva CSC (envia para Focus PUT /v2/empresas/{cnpj}) e/ou ativação. Certificado é salvo via uploadCertificate. */
export type InvoiceSettingsInput = {
  isActive?: boolean;
  cscId?: string;
  cscToken?: string;
  ie?: string;
  im?: string;
  regimeTributario?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
};

type SettingsUpdates = Partial<{
  isActive: boolean;
  cscId: string | null;
  cscToken: string | null;
  ie: string | null;
  im: string | null;
  regimeTributario: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  updatedAt: Date;
}>;

function buildSettingsUpdates(data: InvoiceSettingsInput): SettingsUpdates {
  const updates: SettingsUpdates = { updatedAt: new Date() };
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.cscId !== undefined) updates.cscId = data.cscId?.trim() || null;
  if (data.cscToken !== undefined) updates.cscToken = data.cscToken?.trim() || null;
  if (data.ie !== undefined) updates.ie = data.ie?.trim() || null;
  if (data.im !== undefined) updates.im = data.im?.trim() || null;
  if (data.regimeTributario !== undefined) updates.regimeTributario = data.regimeTributario?.trim() || null;
  if (data.cep !== undefined) updates.cep = data.cep?.trim() || null;
  if (data.logradouro !== undefined) updates.logradouro = data.logradouro?.trim() || null;
  if (data.numero !== undefined) updates.numero = data.numero?.trim() || null;
  if (data.complemento !== undefined) updates.complemento = data.complemento?.trim() || null;
  if (data.bairro !== undefined) updates.bairro = data.bairro?.trim() || null;
  if (data.municipio !== undefined) updates.municipio = data.municipio?.trim() || null;
  if (data.uf !== undefined) updates.uf = data.uf?.trim() || null;
  return updates;
}

async function syncCscToFocus(organizationId: string, cscId: string, cscToken: string): Promise<string | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { document: true },
  });
  const cnpjClean = org?.document?.replaceAll(/\D/g, "") ?? "";
  if (cnpjClean.length !== 14 || !getFocusToken()) return null;
  const response = await focusFetch(`/v2/empresas/${cnpjClean}`, {
    method: "PUT",
    body: JSON.stringify({
      csc_nfce_producao: cscToken,
      id_token_nfce_producao: cscId,
      csc_nfce_homologacao: cscToken,
      id_token_nfce_homologacao: cscId,
    }),
  });
  if (response.ok) return null;
  const errData = await response.json().catch(() => ({}));
  return typeof errData.mensagem === "string" ? errData.mensagem : "Erro ao configurar CSC na Focus.";
}

export async function saveInvoiceSettings(data: InvoiceSettingsInput) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };
  if (session.role !== "owner" && session.role !== "manager") {
    return { error: "Apenas dono ou gerente podem alterar configurações fiscais." };
  }

  const existing = await db.query.invoiceSettings.findFirst({
    where: eq(invoiceSettings.organizationId, session.organizationId),
  });
  const updates = buildSettingsUpdates(data);

  const shouldSyncCsc =
    data.cscId !== undefined &&
    data.cscToken !== undefined &&
    data.cscId.trim().length > 0 &&
    data.cscToken.trim().length > 0;
  if (shouldSyncCsc) {
    try {
      const err = await syncCscToFocus(session.organizationId, data.cscId!.trim(), data.cscToken!.trim());
      if (err) return { error: err };
    } catch (err) {
      console.error("Focus PUT empresas:", err);
      return { error: "Falha ao comunicar com a Focus. Tente novamente." };
    }
  }

  if (existing) {
    await db
      .update(invoiceSettings)
      .set(updates)
      .where(eq(invoiceSettings.organizationId, session.organizationId));
  } else {
    await db.insert(invoiceSettings).values({
      organizationId: session.organizationId,
      isActive: data.isActive ?? false,
      cscId: data.cscId?.trim() || null,
      cscToken: data.cscToken?.trim() || null,
      ie: data.ie?.trim() || null,
      im: data.im?.trim() || null,
      regimeTributario: data.regimeTributario?.trim() || null,
      cep: data.cep?.trim() || null,
      logradouro: data.logradouro?.trim() || null,
      numero: data.numero?.trim() || null,
      complemento: data.complemento?.trim() || null,
      bairro: data.bairro?.trim() || null,
      municipio: data.municipio?.trim() || null,
      uf: data.uf?.trim() || null,
      ...updates,
    });
  }

  return { success: true };
}

/**
 * Upload do certificado A1 (.pfx) para a Focus por sub-conta (CNPJ).
 * O arquivo e a senha NUNCA são persistidos no banco. Envia para POST /v2/empresas/{cnpj}/arquivo_certificado_a1.
 */
export async function uploadCertificate(formData: FormData) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };
  if (session.role !== "owner" && session.role !== "manager") {
    return { error: "Apenas dono ou gerente podem enviar o certificado." };
  }

  const file = formData.get("certificate") as File | null;
  const password = formData.get("password") as string | null;

  if (!file?.size || !password?.trim()) {
    return { error: "Envie o arquivo .pfx e informe a senha do certificado." };
  }

  if (!getFocusToken()) {
    return { error: "Integração fiscal não configurada. Contate o suporte Vestra." };
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
    columns: { document: true },
  });
  const cnpjClean = org?.document?.replaceAll(/\D/g, "") ?? "";
  if (cnpjClean.length !== 14) {
    return { error: "Cadastre o CNPJ da empresa em Configurações → Dados da empresa antes de enviar o certificado." };
  }

  const registerResult = await registerCompanyInFocus(session.organizationId);
  if (registerResult.error && !registerResult.message) {
    return registerResult;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileBase64 = buffer.toString("base64");

    const response = await focusFetch(`/v2/empresas/${cnpjClean}/arquivo_certificado_a1`, {
      method: "POST",
      body: JSON.stringify({ arquivo: fileBase64, senha: password.trim() }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg =
        typeof data.mensagem === "string"
          ? data.mensagem
          : data.errors?.[0]?.mensagem ?? "Senha incorreta ou arquivo inválido.";
      return { error: msg };
    }

    const existing = await db.query.invoiceSettings.findFirst({
      where: eq(invoiceSettings.organizationId, session.organizationId),
    });
    const updates = { certificateStatus: "valid" as const, updatedAt: new Date() };

    if (existing) {
      await db
        .update(invoiceSettings)
        .set(updates)
        .where(eq(invoiceSettings.organizationId, session.organizationId));
    } else {
      await db.insert(invoiceSettings).values({
        organizationId: session.organizationId,
        certificateStatus: "valid",
        updatedAt: new Date(),
      });
    }

    return { success: true };
  } catch (err) {
    console.error("Erro ao enviar certificado:", err);
    return { error: "Falha ao comunicar com o servidor fiscal. Tente novamente." };
  }
}
