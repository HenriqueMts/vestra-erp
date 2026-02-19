import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/get-user-session";
import { isAdmin } from "@/lib/check-access";
import { getDailySales } from "@/actions/sales";
import { CashClosureClient } from "./cash-closure-client";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";

// Sempre buscar dados do dia atual: caixa fechado hoje não bloqueia amanhã (abre automaticamente à meia-noite)
export const dynamic = "force-dynamic";

interface CashClosurePageProps {
  searchParams: Promise<{ store?: string }>;
}

export default async function CashClosurePage({ searchParams }: CashClosurePageProps) {
  const adminCheck = await isAdmin();
  const session = await getUserSession();

  // Admin ou owner/manager podem acessar
  if (!adminCheck && !["owner", "manager"].includes(session.role)) {
    redirect("/dashboard");
  }

  // Buscar todas as lojas da organização
  const allStores = await db.query.stores.findMany({
    where: eq(stores.organizationId, session.organizationId),
    columns: { id: true, name: true },
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  if (allStores.length === 0) {
    redirect("/dashboard");
  }

  // Loja selecionada via query param ou primeira loja disponível
  const params = await searchParams;
  const selectedStoreId = params.store || allStores[0]?.id || session.storeId;

  // Validar que a loja selecionada pertence à organização
  const validStore = allStores.find((s) => s.id === selectedStoreId);
  const effectiveStoreId = validStore?.id || allStores[0]?.id || session.storeId;

  const result = await getDailySales(effectiveStoreId);

  if ("error" in result) {
    redirect("/dashboard");
  }

  return (
    <CashClosureClient
      initialData={result}
      storeId={effectiveStoreId}
      stores={allStores}
    />
  );
}
