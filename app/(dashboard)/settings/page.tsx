import { getUserSession } from "@/lib/get-user-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// CORREÇÃO: Importando do caminho certo
import { LogoUploader } from "@/components/logo-uploader";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getUserSession();

  if (!session) redirect("/login");

  // Assumindo que seu session traz role, orgLogo e orgName.
  // Se 'role' não estiver no session, você precisará buscar no banco 'members'.
  const isOwner = session.role === "owner";

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
          Configurações
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Gerencie os dados da sua organização.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">
              Identidade Visual
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Este logo será exibido no menu lateral e nos relatórios.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {isOwner ? (
              <LogoUploader
                initialUrl={session.orgLogo}
                orgName={session.orgName || "Sua Empresa"}
              />
            ) : (
              <div className="text-xs sm:text-sm text-amber-700 bg-amber-50 p-3 sm:p-4 rounded-lg border border-amber-100 flex items-center gap-2">
                <span>🔒</span>
                Apenas o dono da empresa pode alterar o logotipo.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
