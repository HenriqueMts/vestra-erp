import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/get-user-session";
import { db } from "@/db";
import { sales } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OverviewChart } from "../components/overview-chart";

type SearchParams = Promise<{
  from?: string;
  to?: string;
}>;

function parseDateRange(params: { from?: string; to?: string }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now;

  const from = params.from ? new Date(params.from) : startOfMonth;
  const to = params.to ? new Date(params.to) : today;

  // Normalizar horários
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

export default async function SalesSummaryPage({
  searchParams,
}: Readonly<{
  searchParams: SearchParams;
}>) {
  const session = await getUserSession();
  if (session.role === "seller") {
    redirect("/dashboard");
  }
  const params = await searchParams;

  const { from, to } = parseDateRange(params);

  const [currentPeriod] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
      salesCount: sql<number>`count(*)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, session.organizationId),
        gte(sales.createdAt, from),
        lte(sales.createdAt, to),
      ),
    );

  const periodMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - periodMs);

  const [previousPeriod] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, session.organizationId),
        gte(sales.createdAt, prevFrom),
        lte(sales.createdAt, prevTo),
      ),
    );

  const currentTotal = Number(currentPeriod?.totalCents ?? 0);
  const currentCount = Number(currentPeriod?.salesCount ?? 0);
  const prevTotal = Number(previousPeriod?.totalCents ?? 0);
  const ticketMedio = currentCount > 0 ? currentTotal / currentCount : 0;

  const diffAbs = currentTotal - prevTotal;
  let diffPerc = 0;
  if (prevTotal > 0) {
    diffPerc = (diffAbs / prevTotal) * 100;
  } else if (currentTotal > 0) {
    diffPerc = 100;
  }

  // Gráfico: vendas por mês (últimos 12 meses)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const monthlyAggregates = await db
    .select({
      month: sql<string>`to_char(${sales.createdAt}, 'YYYY-MM')`,
      totalCents: sql<number>`sum(${sales.totalCents})`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, session.organizationId),
        gte(sales.createdAt, twelveMonthsAgo),
      ),
    )
    .groupBy(sql`to_char(${sales.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${sales.createdAt}, 'YYYY-MM')`);

  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  const salesChartData = [];
  const baseDate = new Date(
    twelveMonthsAgo.getFullYear(),
    twelveMonthsAgo.getMonth(),
    1,
  );

  for (let i = 0; i < 12; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
    const record = monthlyAggregates.find((m) => m.month === key);
    const totalCents = Number(record?.totalCents ?? 0);
    const label = monthFormatter.format(d);
    const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);

    salesChartData.push({
      name: formattedLabel,
      total: Math.round(totalCents / 100),
    });
  }

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);

  const formatPercentage = (value: number) => {
    let prefix = "";
    if (value > 0) {
      prefix = "+";
    } else if (value < 0) {
      prefix = "-";
    }
    const absolute = Math.abs(value).toFixed(1);
    return `${prefix}${absolute}%`;
  };

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
          Resumo de Vendas
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Acompanhe o desempenho das vendas por período e por mês.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">
            Período de análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="from"
                className="text-xs font-medium text-muted-foreground"
              >
                De
              </label>
              <Input
                type="date"
                name="from"
                id="from"
                defaultValue={from.toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="to"
                className="text-xs font-medium text-muted-foreground"
              >
                Até
              </label>
              <Input
                type="date"
                name="to"
                id="to"
                defaultValue={to.toISOString().slice(0, 10)}
              />
            </div>
            <Button type="submit" className="mt-2 sm:mt-0">
              Aplicar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total no período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-chart-2">
              {formatCurrency(currentTotal)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {currentCount} venda(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Ticket médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {formatCurrency(ticketMedio)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Valor médio por venda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Período anterior
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {formatCurrency(prevTotal)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Mesmo número de dias anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Variação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl sm:text-3xl font-bold ${
                diffAbs >= 0 ? "text-chart-2" : "text-destructive"
              }`}
            >
              {formatPercentage(diffPerc)}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Diferença de {formatCurrency(Math.abs(diffAbs))} em relação ao
              período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl">
            Vendas por mês (últimos 12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pl-2 sm:pl-6">
          <div className="h-80 sm:h-96 w-full">
            <OverviewChart data={salesChartData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

