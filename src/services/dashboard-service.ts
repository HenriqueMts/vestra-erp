import { db } from "@/db";
import { clients } from "@/db/schema";
import { sql, desc, gte, eq, and } from "drizzle-orm"; // Adicionado 'eq' e 'and'

// Agora a função EXIGE o userId para funcionar
export async function getDashboardMetrics(userId: string) {
  // 1. Total de Clientes (DO USUÁRIO)
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(eq(clients.createdBy, userId)); // <--- Filtro Crucial

  const totalClients = Number(totalResult.count);

  // 2. Novos Clientes (Últimos 30 dias DO USUÁRIO)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [newClientsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(
      and(
        gte(clients.createdAt, thirtyDaysAgo),
        eq(clients.createdBy, userId), // <--- Filtro Crucial
      ),
    );

  const newClients = Number(newClientsResult.count);

  // 3. Últimos 5 Clientes (DO USUÁRIO)
  const recentClients = await db.query.clients.findMany({
    where: eq(clients.createdBy, userId), // <--- Filtro Crucial
    orderBy: [desc(clients.createdAt)],
    limit: 5,
  });

  // 4. Dados para o Gráfico (DO USUÁRIO)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const allClientsForGraph = await db.query.clients.findMany({
    where: and(
      gte(clients.createdAt, sixMonthsAgo),
      eq(clients.createdBy, userId), // <--- Filtro Crucial
    ),
    columns: {
      createdAt: true,
    },
  });

  // ... (O restante da lógica de processamento do gráfico JS permanece igual)
  const chartDataMap = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toLocaleString("pt-BR", { month: "short" });
    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
    chartDataMap.set(formattedKey, 0);
  }

  allClientsForGraph.forEach((client) => {
    if (!client.createdAt) return;
    const date = new Date(client.createdAt);
    const key = date.toLocaleString("pt-BR", { month: "short" });
    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);

    if (chartDataMap.has(formattedKey)) {
      chartDataMap.set(formattedKey, (chartDataMap.get(formattedKey) || 0) + 1);
    }
  });

  const chartData = Array.from(chartDataMap.entries())
    .map(([name, total]) => ({ name, total }))
    .reverse();

  return {
    totalClients,
    newClients,
    recentClients,
    chartData,
  };
}
