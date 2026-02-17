import { getUserSession } from "@/lib/get-user-session";
import { listOrganizationsForAdmin, listOrganizationPayments } from "@/actions/billing";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { MinhaContaAdminClient } from "@/components/minha-conta-admin-client";
import { MinhaContaFaturasClient } from "@/components/minha-conta-faturas-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, FileText } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MinhaContaPage() {
  const session = await getUserSession();
  if (!session?.user?.email) redirect("/login");
  if (session.role === "seller") redirect("/dashboard");

  const isAdmin = isPlatformAdmin(session.user.email);

  if (isAdmin) {
    const result = await listOrganizationsForAdmin();
    if (result?.error) {
      return (
        <div className="w-full min-h-screen space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="rounded-lg bg-muted border border-border text-foreground p-4">
            {result.error}
          </div>
        </div>
      );
    }
    const organizations = result?.organizations ?? [];

    return (
      <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Minha conta
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestão de clientes e cobrança no Asaas. Cadastre organizações e acompanhe o status.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Building2 size={20} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Clientes Vestra (Asaas)</CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1">
                  Organizações que usam o Vestra. Use &quot;Cadastrar no Asaas&quot; para criar o cliente na sua conta e depois definir o plano (assinatura).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <MinhaContaAdminClient organizations={organizations} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dono/usuário da organização: ver suas faturas
  const paymentsResult = await listOrganizationPayments(session.organizationId);
  const payments = paymentsResult?.payments ?? null;
  const paymentsError = paymentsResult?.error ?? null;

  // Verificar se está bloqueado
  const isBlocked = session.billingStatus === "suspended";

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
          Minha conta
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Suas faturas e boletos do plano Vestra.
        </p>
      </div>

      {isBlocked && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-destructive/20 rounded-lg">
                <FileText className="text-destructive" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">Acesso suspenso</h3>
                <p className="text-sm text-destructive/90">
                  Seu plano está suspenso por falta de pagamento. Regularize suas pendências abaixo para continuar usando o sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileText size={20} />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl">Faturas e boletos</CardTitle>
              <CardDescription className="text-sm sm:text-base mt-1">
                Cobranças mensais do seu plano. Pague pelo boleto ou link de pagamento.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <MinhaContaFaturasClient
            payments={payments}
            error={paymentsError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
