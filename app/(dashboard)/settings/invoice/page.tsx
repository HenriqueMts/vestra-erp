import { getUserSession } from "@/lib/get-user-session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InvoiceSettingsWizard } from "@/components/invoice-settings-wizard";
import { isAdmin } from "@/lib/check-access";

export default async function InvoiceSettingsPage() {
  const adminCheck = await isAdmin();
  const session = await getUserSession();
  if (!session) redirect("/login");
  if (!adminCheck && session.role === "seller") redirect("/dashboard");

  const canManage = adminCheck || session.role === "owner" || session.role === "manager";

  return (
    <div className="w-full min-h-screen space-y-6 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="space-y-1">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-2">
            Configurações <span className="text-muted-foreground">/</span>{" "}
            <span className="text-foreground font-semibold">
              Nota Fiscal (NFC-e)
            </span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Nota Fiscal ao Consumidor (NFC-e)
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure seu certificado digital e o código CSC para emitir suas
            notas.
          </p>
        </div>
      </div>

      {canManage ? (
        <InvoiceSettingsWizard />
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          Apenas dono ou gerente da empresa podem alterar as configurações
          fiscais.
        </div>
      )}
    </div>
  );
}
