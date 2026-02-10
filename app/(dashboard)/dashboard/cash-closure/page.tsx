import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/get-user-session";
import { getDailySales } from "@/actions/sales";
import { CashClosureClient } from "./cash-closure-client";

// Sempre buscar dados do dia atual: caixa fechado hoje não bloqueia amanhã (abre automaticamente à meia-noite)
export const dynamic = "force-dynamic";

export default async function CashClosurePage() {
  const session = await getUserSession();

  if (!["owner", "manager"].includes(session.role)) {
    redirect("/dashboard");
  }

  const result = await getDailySales(session.storeId);

  if ("error" in result) {
    redirect("/dashboard");
  }

  return <CashClosureClient initialData={result} storeId={session.storeId} />;
}
