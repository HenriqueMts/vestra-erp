import { db } from "@/db";
import { stores } from "@/db/schema";
import { getUserSession } from "@/lib/get-user-session";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Store, ArrowRight, ShieldAlert } from "lucide-react";
import { selectStoreAction } from "@/actions/pos";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SelectStorePage() {
  const session = await getUserSession();

  if (!session) redirect("/login");

  if (session.role === "seller" && session.storeId) {
    await selectStoreAction(session.storeId);
    return null;
  }

  const availableStores = await db.query.stores.findMany({
    where: eq(stores.organizationId, session.organizationId),
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Bem-vindo ao Vestra POS
          </h1>
          <p className="text-slate-500">
            Selecione em qual unidade você deseja iniciar as operações de caixa
            hoje.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableStores.length === 0 ? (
            <Card className="col-span-full border-dashed border-2 bg-slate-100/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldAlert className="h-10 w-10 text-amber-500 mb-4" />
                <h3 className="font-semibold text-lg">
                  Nenhuma loja encontrada
                </h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                  Peça ao administrador para cadastrar uma loja no painel
                  administrativo antes de prosseguir.
                </p>
              </CardContent>
            </Card>
          ) : (
            availableStores.map((store) => (
              <form
                key={store.id}
                action={async () => {
                  "use server";
                  await selectStoreAction(store.id);
                }}
              >
                <button className="w-full text-left group h-full">
                  <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-slate-400 cursor-pointer group-hover:bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                        <Store size={24} />
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
                    </CardHeader>
                    <CardContent className="pt-4">
                      <CardTitle className="text-xl mb-1">
                        {store.name}
                      </CardTitle>
                      <CardDescription>
                        Clique para acessar o PDV
                      </CardDescription>
                    </CardContent>
                  </Card>
                </button>
              </form>
            ))
          )}
        </div>

        {["owner", "manager"].includes(session.role) && (
          <a
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-900 underline"
          >
            Voltar para o Painel Administrativo
          </a>
        )}
      </div>
    </div>
  );
}
