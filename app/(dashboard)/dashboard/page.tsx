import { Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OverviewChart } from "./components/overview-chart";
import { RecentClients } from "./components/recent-clients";
import { getDashboardMetrics } from "@/services/dashboard-service";
import { createClient } from "@/utils/supabase/server"; // Importar Supabase
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // 1. Obter Usuário Logado
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Segurança extra: se não tiver user, manda pro login
  if (!user) {
    redirect("/login");
  }

  // 2. Passar o ID do usuário para o serviço
  const { totalClients, newClients, recentClients, chartData } =
    await getDashboardMetrics(user.id);

  return (
    // ... (O restante do JSX permanece EXATAMENTE igual)
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h2>
        <p className="text-slate-500">
          Bem-vindo ao painel de controle da Jilem Modas.
        </p>
      </div>

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

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Visão Geral de Cadastros</CardTitle>
          <p className="text-sm text-slate-500">
            Acompanhamento de novos clientes nos últimos 6 meses.
          </p>
        </CardHeader>
        <CardContent className="pl-2 h-[450px]">
          <OverviewChart data={chartData} />
        </CardContent>
      </Card>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Últimos Clientes Adicionados</CardTitle>
          <p className="text-sm text-slate-500">
            Registros mais recentes no sistema.
          </p>
        </CardHeader>
        <CardContent>
          <RecentClients clients={recentClients} />
        </CardContent>
      </Card>
    </div>
  );
}
