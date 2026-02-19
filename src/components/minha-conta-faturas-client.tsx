"use client";

import type { BillingPayment } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";

function formatCurrency(valueReais: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueReais);
}

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})/;

/** Formata data YYYY-MM-DD em DD/MM/YYYY sem alterar por fuso (evita dia 9 em vez de 10). */
function formatDate(iso: string) {
  try {
    const match = ISO_DATE_REGEX.exec(String(iso).trim());
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: string) {
  const s = status?.toLowerCase() ?? "";
  if (s === "confirmed" || s === "received") return { label: "Pago", className: "text-primary bg-primary/10" };
  if (s === "pending") return { label: "Pendente", className: "text-muted-foreground bg-muted" };
  if (s === "overdue") return { label: "Vencido", className: "text-destructive bg-destructive/10" };
  return { label: status || "—", className: "text-muted-foreground bg-muted" };
}

type Props = Readonly<{
  payments: BillingPayment[] | null;
  error: string | null;
}>;

export function MinhaContaFaturasClient({ payments, error }: Props) {
  if (error) {
    return (
      <div className="rounded-lg bg-muted border border-border text-foreground text-sm p-4">
        {error}
      </div>
    );
  }

  if (payments === null || payments.length === 0) {
    return (
      <div className="rounded-lg bg-muted border border-border text-muted-foreground text-sm p-6 text-center">
        <FileText className="mx-auto mb-2 text-muted-foreground" size={32} />
        <p className="font-medium">Nenhuma fatura no momento</p>
        <p className="mt-1 text-xs">
          Quando sua empresa estiver no plano de cobrança, os boletos mensais aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left font-semibold text-foreground p-3">Vencimento</th>
              <th className="text-left font-semibold text-foreground p-3">Valor</th>
              <th className="text-left font-semibold text-foreground p-3 hidden sm:table-cell">Status</th>
              <th className="text-right font-semibold text-foreground p-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const status = statusLabel(p.status);
              const url = p.bankSlipUrl || p.invoiceUrl;
              return (
                <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                  <td className="p-3 text-foreground">{formatDate(p.dueDate)}</td>
                  <td className="p-3 font-medium text-foreground">{formatCurrency(p.value)}</td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-primary hover:text-primary/90 hover:bg-primary/10"
                        asChild
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={14} />
                          Ver boleto
                        </a>
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
