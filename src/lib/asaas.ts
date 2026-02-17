/**
 * Cliente HTTP para a API Asaas (v3).
 * Uma única conta Asaas (Vestra); clientes no Asaas = organizações Vestra.
 */

function getApiKey(): string | null {
  // Tenta múltiplas formas de obter a chave
  let key = process.env.ASAAS_API_KEY?.trim() || null;
  
  // Remove aspas simples ou duplas se presentes (alguns sistemas podem adicionar)
  if (key) {
    if ((key.startsWith('"') && key.endsWith('"')) || 
        (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1).trim();
    }
    // Se a chave começar com \$ (escapado), remove a barra invertida
    if (key.startsWith("\\$")) {
      key = "$" + key.substring(2);
    }
  }
  
  // Debug detalhado em desenvolvimento
  if (process.env.NODE_ENV === "development") {
    const rawKey = process.env.ASAAS_API_KEY;
    const allAsaasVars = Object.keys(process.env).filter(k => k.startsWith("ASAAS"));
    
    console.log("[Asaas] ===== DEBUG ======");
    console.log("[Asaas] Raw ASAAS_API_KEY:", rawKey ? `${rawKey.substring(0, 25)}... (length: ${rawKey.length})` : "undefined/null");
    console.log("[Asaas] ASAAS_ENV:", process.env.ASAAS_ENV);
    console.log("[Asaas] Variáveis ASAAS encontradas:", allAsaasVars.length > 0 ? allAsaasVars : "NENHUMA");
    console.log("[Asaas] Key após trim:", key ? `${key.substring(0, 25)}...` : "null");
    
    if (!key) {
      console.error("[Asaas] ❌ ERRO: ASAAS_API_KEY não encontrada!");
      console.error("[Asaas] SOLUÇÕES:");
      console.error("  1. Pare o servidor completamente (Ctrl+C)");
      console.error("  2. Verifique se .env.local está na raiz do projeto");
      console.error("  3. Verifique se não há espaços antes do nome da variável");
      console.error("  4. Verifique se a linha está assim: ASAAS_API_KEY=$aact_prod_...");
      console.error("  5. Inicie o servidor novamente: npm run dev");
      console.error("  6. Se ainda não funcionar, tente deletar .next e node_modules/.cache");
    } else {
      // Detecta ambiente pela chave
      const isSandboxKey = key.startsWith("$aact_hmlg_");
      const isProdKey = key.startsWith("$aact_prod_");
      const envSetting = process.env.ASAAS_ENV;
      
      if (isSandboxKey && envSetting === "production") {
        console.warn("[Asaas] ⚠️ ATENÇÃO: Chave SANDBOX com ASAAS_ENV=production");
        console.warn("[Asaas] Altere para: ASAAS_ENV=sandbox");
      } else if (isProdKey && envSetting !== "production") {
        console.warn("[Asaas] ⚠️ ATENÇÃO: Chave PRODUÇÃO mas ASAAS_ENV não é 'production'");
      } else {
        console.log("[Asaas] ✓ Chave detectada e ambiente configurado corretamente");
      }
    }
    console.log("[Asaas] ==================");
  }
  
  return key;
}

// Determina a base URL baseado no ambiente configurado
const ASAAS_BASE =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com"
    : "https://api-sandbox.asaas.com";

export function isAsaasConfigured(): boolean {
  const configured = !!getApiKey();
  if (process.env.NODE_ENV === "development" && !configured) {
    console.warn("[Asaas] Asaas não está configurado. Verifique se ASAAS_API_KEY está no .env.local e reinicie o servidor.");
  }
  return configured;
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
    "User-Agent": "Vestra-ERP/1.0",
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
