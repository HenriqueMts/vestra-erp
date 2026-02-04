import { getUserSession } from "@/lib/get-user-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoUploader } from "@/components/logo-uploader";
import { StoresSettings } from "@/components/stores-settings"; // <--- Novo Componente
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export default async function SettingsPage() {
  const session = await getUserSession();

  if (!session) redirect("/login");

  const isOwner = session.role === "owner";

  // Buscar lojas da organização ordenadas por criação (a primeira é a Matriz)
  const organizationStores = await db
    .select()
    .from(stores)
    .where(eq(stores.organizationId, session.organizationId))
    .orderBy(asc(stores.createdAt));

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

      <div className="grid gap-6">
        {/* CARD 1: LOGO */}
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

        {/* CARD 2: LOJAS E FILIAIS */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">
              Lojas e Filiais
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Gerencie os locais físicos da sua empresa. A primeira loja criada
              é considerada a Matriz.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {isOwner ? (
              <StoresSettings initialStores={organizationStores} />
            ) : (
              <div className="text-xs sm:text-sm text-slate-500 italic">
                Você não tem permissão para gerenciar lojas.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
