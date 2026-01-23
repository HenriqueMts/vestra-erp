import { db } from "@/db";
import { clients } from "@/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { Users, UserPlus, TrendingUp, ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Métricas Reais do Banco de Dados
  const [totalClientsResult] = await db
    .select({ value: count() })
    .from(clients)
    .where(eq(clients.userId, user.id));

  // Simulação de "Clientes este mês" (Filtro por data no SQL)
  const [newClientsMonth] = await db
    .select({ value: count() })
    .from(clients)
    .where(
      sql`${clients.userId} = ${user.id} AND ${clients.createdAt} >= NOW() - INTERVAL '30 days'`,
    );

  const stats = [
    {
      title: "Total de Clientes",
      value: totalClientsResult.value.toString(),
      description: "Base total cadastrada",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Novos (30 dias)",
      value: `+${newClientsMonth.value}`,
      description: "Crescimento mensal",
      icon: UserPlus,
      color: "text-emerald-600",
    },
    {
      title: "Taxa de Retenção",
      value: "98%",
      description: "Clientes ativos no sistema",
      icon: TrendingUp,
      color: "text-slate-600",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="text-slate-500">
          Bem-vindo ao painel de controle da Jilem Modas.
        </p>
      </div>

      {/* Grid de Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-slate-100 shadow-sm overflow-hidden bg-white"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stat.value}
              </div>
              <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Área de Insights e Atividades Recentes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-100 bg-white">
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>
              Crescimento da base de clientes nos últimos meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 h-[300px] flex items-center justify-center text-slate-300 border-t border-slate-50">
            {/* Aqui entra o gráfico que faremos com Recharts posteriormente */}
            <div className="text-center italic text-sm">
              Gráfico de evolução será renderizado aqui.
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-slate-100 bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Últimos Clientes</CardTitle>
              <CardDescription>Recém adicionados ao sistema.</CardDescription>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300" />
          </CardHeader>
          <CardContent>
            {/* Listagem rápida conforme o estilo da sua tabela */}
            <div className="space-y-4">
              {totalClientsResult.value === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8 italic">
                  Sem clientes recentes.
                </p>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8 italic">
                  Dados reais aparecerão aqui.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
