import { db } from "@/db";
import { clients } from "@/db/schema";
import { sql, desc, gte } from "drizzle-orm";

export async function getDashboardMetrics() {
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients);
  const totalClients = Number(totalResult.count);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [newClientsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(gte(clients.createdAt, thirtyDaysAgo));

  const newClients = Number(newClientsResult.count);

  const recentClients = await db.query.clients.findMany({
    orderBy: [desc(clients.createdAt)],
    limit: 5,
  });

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // Pega 6 meses atrás
  sixMonthsAgo.setDate(1);

  const allClientsForGraph = await db.query.clients.findMany({
    where: gte(clients.createdAt, sixMonthsAgo),
    columns: {
      createdAt: true,
    },
  });

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
