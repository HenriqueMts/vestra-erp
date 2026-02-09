import Link from "next/link";
import { getUserSession } from "@/lib/get-user-session";
import { db } from "@/db";
import { clients, sales } from "@/db/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp, ArrowLeft, Package, AlertTriangle } from "lucide-react";

import { OverviewChart } from "./components/overview-chart";
import { RecentClients } from "./components/recent-clients";
import { RecentSales } from "./components/recent-sales";
import { CloseCashButton } from "./components/close-cash-button";
import { getStockOverview } from "@/actions/products";

export default async function DashboardPage() {
  const { organizationId, orgName, role, storeId } = await getUserSession();

  const [totalClientsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(eq(clients.organizationId, organizationId));

  const totalClients = Number(totalClientsResult.count);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [newClientsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(
      and(
        eq(clients.organizationId, organizationId),
        gte(clients.createdAt, thirtyDaysAgo),
      ),
    );

  const newClients = Number(newClientsResult.count);

  const recentClientsData = await db.query.clients.findMany({
    where: eq(clients.organizationId, organizationId),
    orderBy: [desc(clients.createdAt)],
    limit: 5,
  });

  const allClientsDates = await db
    .select({ createdAt: clients.createdAt })
    .from(clients)
    .where(eq(clients.organizationId, organizationId));

  const chartData = generateLast6MonthsData(allClientsDates);

  const [totalSalesResult] = await db
    .select({
      total: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
    })
    .from(sales)
    .where(eq(sales.organizationId, organizationId));

  const totalSalesCents = Number(totalSalesResult?.total ?? 0);

  const recentSalesData = await db.query.sales.findMany({
    where: eq(sales.organizationId, organizationId),
    orderBy: [desc(sales.createdAt)],
    limit: 10,
    with: {
      store: { columns: { name: true } },
      client: { columns: { name: true } },
    },
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);

  const stockOverview = await getStockOverview();

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Visão geral da loja {orgName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {["owner", "manager"].includes(role) && (
            <CloseCashButton storeId={storeId} />
          )}
          <Link href="/pos">
            <Button variant="outline" className="gap-2">
              <ArrowLeft size={16} />
              Voltar ao PDV
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total de Clientes
            </CardTitle>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {totalClients}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Base ativa cadastrada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Novos (30 dias)
            </CardTitle>
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
              +{newClients}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Crescimento recente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total de Vendas
            </CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
              {formatCurrency(totalSalesCents)}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Somatório de todas as vendas
            </p>
          </CardContent>
        </Card>
      </div>

      {stockOverview && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            Panorama do Estoque
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link href="/inventory/products">
              <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Produtos ativos
                  </CardTitle>
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {stockOverview.totalProducts}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    No catálogo
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/inventory/products">
              <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Unidades em estoque
                  </CardTitle>
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {stockOverview.totalUnits.toLocaleString("pt-BR")}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Total (todas as lojas)
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/inventory/products">
              <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Estoque baixo (≤5 un)
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-amber-600">
                    {stockOverview.lowStockCount}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Produtos para repor
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl">
            Evolução de Cadastros (6 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pl-2 sm:pl-6">
          <div className="h-80 sm:h-96 w-full">
            <OverviewChart data={chartData} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">
              Vendas Recentes
            </CardTitle>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">
              Últimas vendas realizadas no PDV.
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <RecentSales sales={recentSalesData} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">
              Clientes Recentes
            </CardTitle>
            <div className="text-xs sm:text-sm text-slate-600 mt-1">
              Últimos cadastros realizados na plataforma.
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <RecentClients clients={recentClientsData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function generateLast6MonthsData(clientsList: { createdAt: Date | null }[]) {
  const data = [];
  const today = new Date();
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthIndex = d.getMonth();
    const year = d.getFullYear();

    const name = monthFormatter.format(d);
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    const total = clientsList.filter((c) => {
      if (!c.createdAt) return false;
      const clientDate = new Date(c.createdAt);
      return (
        clientDate.getMonth() === monthIndex &&
        clientDate.getFullYear() === year
      );
    }).length;

    data.push({ name: formattedName, total });
  }

  return data;
}
