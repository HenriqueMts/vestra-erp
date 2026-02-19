import { redirect } from "next/navigation";
import { getCashClosureReport } from "@/actions/sales";
import { getUserSession } from "@/lib/get-user-session";
import { isAdmin } from "@/lib/check-access";
import { CashClosurePrintClient } from "./cash-closure-print-client";

export const dynamic = "force-dynamic";

interface PrintPageProps {
  searchParams: Promise<{ closureId?: string }>;
}

export default async function CashClosurePrintPage({ searchParams }: PrintPageProps) {
  const adminCheck = await isAdmin();
  const session = await getUserSession();

  if (!adminCheck && !["owner", "manager"].includes(session.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const closureId = params.closureId;

  if (!closureId) {
    redirect("/dashboard/cash-closure");
  }

  const result = await getCashClosureReport(closureId);

  if ("error" in result || !result.success || !result.data) {
    redirect("/dashboard/cash-closure");
  }

  return <CashClosurePrintClient report={result.data} />;
}
