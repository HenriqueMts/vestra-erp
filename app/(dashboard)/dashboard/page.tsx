import { Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OverviewChart } from "./components/overview-chart";
import { RecentClients } from "./components/recent-clients";
import { getDashboardMetrics } from "@/services/dashboard-service";

export default async function DashboardPage() {
  const { totalClients, newClients, recentClients, chartData } =
    await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h2>
        <p className="text-slate-500">
          Bem-vindo ao painel de controle da Jilem Modas.
        </p>
      </div>

      {/* 1. TOPO: Cards de Métricas (Lado a Lado) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total de Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {totalClients}
            </div>
            <p className="text-xs text-slate-500">Base total cadastrada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Novos (30 dias)
            </CardTitle>
            <UserPlus className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              +{newClients}
            </div>
            <p className="text-xs text-slate-500">Crescimento mensal</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. MEIO: Gráfico Gigante (Ocupando toda a largura) */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Visão Geral de Cadastros</CardTitle>
          <p className="text-sm text-slate-500">
            Acompanhamento de novos clientes nos últimos 6 meses.
          </p>
        </CardHeader>
        {/* Aumentei a altura para 450px para dar o destaque de "80%" visual que você pediu */}
        <CardContent className="pl-2 h-[450px]">
          <OverviewChart data={chartData} />
        </CardContent>
      </Card>

      {/* 3. BAIXO: Lista de Clientes (Mesma largura do Gráfico) */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Últimos Clientes Adicionados</CardTitle>
          <p className="text-sm text-slate-500">
            Registros mais recentes no sistema.
          </p>
        </CardHeader>
        <CardContent>
          {/* A lista vai se esticar automaticamente para ocupar a largura total */}
          <RecentClients clients={recentClients} />
        </CardContent>
      </Card>
    </div>
  );
}
