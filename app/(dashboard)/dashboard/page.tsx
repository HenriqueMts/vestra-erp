import { getUserSession } from "@/lib/get-user-session";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, TrendingUp } from "lucide-react";

import { OverviewChart } from "./components/overview-chart";
import { RecentClients } from "./components/recent-clients";

export default async function DashboardPage() {
  const { organizationId, orgName } = await getUserSession();

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

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          Visão geral da loja {orgName}
        </p>
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
              Vendas Ativas
            </CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              R$ 0,00
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Módulo em desenvolvimento
            </p>
          </CardContent>
        </Card>
      </div>

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
