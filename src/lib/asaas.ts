/**
 * Cliente HTTP para a API Asaas (v3).
 * Uma única conta Asaas (Vestra); clientes no Asaas = organizações Vestra.
 */

const ASAAS_BASE =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com"
    : "https://api-sandbox.asaas.com";

function getApiKey(): string | null {
  const key = process.env.ASAAS_API_KEY?.trim();
  return key || null;
}

export function isAsaasConfigured(): boolean {
  return !!getApiKey();
}

export async function asaasFetch(
  path: string,
  options: RequestInit & { method?: string; body?: unknown } = {}
): Promise<Response> {
  const key = getApiKey();
  if (!key) throw new Error("ASAAS_API_KEY não configurada");

  const { body, ...rest } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    access_token: key,
    ...options.headers,
  };

  return fetch(`${ASAAS_BASE}/v3${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export type AsaasCustomer = {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
};

export type AsaasPayment = {
  id: string;
  customer: string;
  value: number;
  netValue?: number;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string | null;
  description?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
};
