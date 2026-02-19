"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CashClosureReportSale } from "@/actions/sales";

type ReportData = {
  closure: {
    id: string;
    totalCents: number;
    salesCount: number;
    periodStart: Date | string;
    periodEnd: Date | string;
    createdAt: Date | string | null;
  };
  storeName: string;
  orgName: string;
  closedByName: string;
  sales: CashClosureReportSale[];
};

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
};

export function CashClosurePrintClient({ report }: { report: ReportData }) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const didPrint = useRef(false);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);

  const formatDate = (date: Date | string | null) =>
    date
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(date))
      : "—";

  const formatDateTime = (date: Date | string | null) =>
    date
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(date))
      : "—";

  useEffect(() => {
    if (didPrint.current) return;
    didPrint.current = true;
    const t = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-8">
      {/* Botão apenas na tela (oculto na impressão) */}
      <div className="mb-6 flex gap-3 print:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Voltar
        </Button>
        <Button type="button" onClick={() => window.print()}>
          Imprimir relatório
        </Button>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* Cabeçalho */}
        <header className="border-b border-gray-300 pb-4">
          <h1 className="text-2xl font-bold">Relatório de Fechamento de Caixa</h1>
          <p className="mt-1 text-sm text-gray-600">
            {report.orgName} · {report.storeName}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <p><strong>Período:</strong> {formatDate(report.closure.periodStart)}</p>
            <p><strong>Fechado por:</strong> {report.closedByName}</p>
            <p><strong>Data do fechamento:</strong> {formatDateTime(report.closure.createdAt)}</p>
          </div>
        </header>

        {/* Resumo */}
        <section>
          <h2 className="text-lg font-semibold">Resumo</h2>
          <ul className="mt-2 list-disc list-inside text-sm">
            <li>Total de vendas: {report.closure.salesCount}</li>
            <li>Total arrecadado: {formatCurrency(report.closure.totalCents)}</li>
          </ul>
        </section>

        {/* Vendas do dia */}
        <section>
          <h2 className="text-lg font-semibold">Vendas do dia</h2>
          <table className="mt-3 w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left font-medium">ID</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-medium">Data/Hora</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-medium">Vendedor</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-medium">Cliente</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-medium">Forma de pagamento</th>
                <th className="border border-gray-300 px-2 py-2 text-left font-medium">Itens</th>
                <th className="border border-gray-300 px-2 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="border border-gray-300 px-2 py-1.5 font-mono text-xs">
                    {sale.id.slice(0, 8)}...
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    {formatDateTime(sale.createdAt)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    {sale.seller?.name ?? "—"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    {sale.client?.name ?? "—"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    {paymentMethodLabels[sale.paymentMethod] ?? sale.paymentMethod}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5">
                    {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-right font-medium">
                    {formatCurrency(sale.totalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Rodapé */}
        <footer className="mt-8 border-t border-gray-300 pt-4 text-xs text-gray-500">
          Documento gerado em {formatDateTime(new Date())} · Vestra ERP
        </footer>
      </div>
    </div>
  );
}
