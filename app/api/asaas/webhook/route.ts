import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Webhook do Asaas para receber eventos de pagamento.
 * 
 * Configuração no painel Asaas:
 * - URL: https://seu-dominio.com/api/asaas/webhook?token=SEU_TOKEN
 * - Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE
 * - Versão da API: v3
 * 
 * Autenticação via query param ?token= (deve corresponder a ASAAS_WEBHOOK_TOKEN no .env.local)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validar token de autenticação
    const token = request.nextUrl.searchParams.get("token");
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
    
    if (!expectedToken) {
      console.error("[Asaas Webhook] ASAAS_WEBHOOK_TOKEN não configurada");
      return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 });
    }
    
    if (token !== expectedToken) {
      console.warn("[Asaas Webhook] Token inválido recebido");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Ler o payload do evento
    const body = await request.json();
    const event = body.event as string;
    const payment = body.payment as {
      id?: string;
      customer?: string;
      status?: string;
      value?: number;
      dueDate?: string;
      paymentDate?: string | null;
    };

    console.log("[Asaas Webhook] Evento recebido:", event, "Payment:", payment?.id);

    if (!payment?.customer) {
      console.warn("[Asaas Webhook] Evento sem customer ID");
      return NextResponse.json({ error: "Customer ID não encontrado" }, { status: 400 });
    }

    // 3. Buscar organização pelo asaasCustomerId
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.asaasCustomerId, payment.customer),
      columns: { id: true, name: true, billingStatus: true },
    });

    if (!org) {
      console.warn("[Asaas Webhook] Organização não encontrada para customer:", payment.customer);
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    // 4. Processar eventos e atualizar status
    let newBillingStatus: "active" | "overdue" | "suspended" | null = null;
    let shouldUpdateSuspendedAt = false;
    let accessSuspendedAt: Date | null = null;

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // Pagamento recebido: marca como ativo e remove suspensão
      newBillingStatus = "active";
      shouldUpdateSuspendedAt = true;
      accessSuspendedAt = null;
      console.log(`[Asaas Webhook] Pagamento recebido para ${org.name} - Ativando acesso`);
    } else if (event === "PAYMENT_OVERDUE") {
      // Pagamento vencido: verificar período de graça antes de suspender
      // Cliente tem 3 dias para pagar o boleto + 5 dias de tolerância = 8 dias total
      // Só suspende após 5 dias do vencimento (ou seja, 8 dias desde a data de vencimento)
      
      if (payment.dueDate) {
        const dueDate = new Date(payment.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar para comparar apenas datas
        dueDate.setHours(0, 0, 0, 0);
        
        // Calcular dias desde o vencimento
        const daysSinceDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceDue >= 5) {
          // Passaram 5 dias ou mais: suspender acesso
          newBillingStatus = "suspended";
          shouldUpdateSuspendedAt = true;
          accessSuspendedAt = new Date();
          console.log(`[Asaas Webhook] Pagamento vencido há ${daysSinceDue} dias para ${org.name} - Suspendo acesso`);
        } else {
          // Ainda dentro do período de graça: apenas marcar como overdue
          newBillingStatus = "overdue";
          shouldUpdateSuspendedAt = false;
          console.log(`[Asaas Webhook] Pagamento vencido há ${daysSinceDue} dias para ${org.name} - Marcando como overdue (período de graça)`);
        }
      } else {
        // Se não tiver dueDate, suspender imediatamente (fallback)
        newBillingStatus = "suspended";
        shouldUpdateSuspendedAt = true;
        accessSuspendedAt = new Date();
        console.log(`[Asaas Webhook] Pagamento vencido para ${org.name} (sem data) - Suspendo acesso`);
      }
    }

    // 5. Atualizar organização se houver mudança de status
    if (newBillingStatus !== null) {
      const updateData: {
        billingStatus: "active" | "overdue" | "suspended";
        accessSuspendedAt?: Date | null;
      } = {
        billingStatus: newBillingStatus,
      };
      
      if (shouldUpdateSuspendedAt) {
        updateData.accessSuspendedAt = accessSuspendedAt;
      }
      
      await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, org.id));
      
      console.log(`[Asaas Webhook] Status atualizado para ${org.name}: ${newBillingStatus}`);
    }

    // 6. Retornar 200 rapidamente (processar assíncrono se necessário)
    return NextResponse.json({ success: true, event, organizationId: org.id });
  } catch (error) {
    console.error("[Asaas Webhook] Erro ao processar webhook:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}
