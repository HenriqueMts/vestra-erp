import { Store, Receipt } from "lucide-react";

interface Sale {
  id: string;
  totalCents: number;
  createdAt: Date | string | null;
  store: { name: string } | null;
  client: { name: string } | null;
}

interface RecentSalesProps {
  sales: Sale[];
}

export function RecentSales({ sales }: Readonly<RecentSalesProps>) {
  if (sales.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
        <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
      </div>
    );
  }

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
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(date))
      : "-";

  return (
    <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1">
      {sales.map((sale) => (
        <div
          key={sale.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
              <Receipt size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">
                {sale.client?.name || "Cliente não informado"}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Store size={12} />
                {sale.store?.name || "-"} • {formatDate(sale.createdAt)}
              </p>
            </div>
          </div>
          <span className="font-semibold text-chart-2 shrink-0 ml-2">
            {formatCurrency(sale.totalCents)}
          </span>
        </div>
      ))}
    </div>
  );
}
