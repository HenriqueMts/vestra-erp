import { getUserSession } from "@/lib/get-user-session";
import { isAdmin } from "@/lib/check-access";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationCard } from "@/components/organization-card";
import { StoresSettings } from "@/components/stores-settings";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Palette, ArrowRight, Tag, FileText } from "lucide-react";
import { getOrganization } from "@/actions/organization";

export default async function SettingsPage() {
  const adminCheck = await isAdmin();
  const session = await getUserSession();

  if (!session) redirect("/login");
  // Admin ou owner/manager podem acessar, seller não
  if (!adminCheck && session.role === "seller") redirect("/dashboard");

  const isOwner = adminCheck || session.role === "owner";
  const canManageAttributes = adminCheck || ["owner", "manager"].includes(session.role);

  // Buscar lojas e dados da organização
  const [organizationStores, orgResult] = await Promise.all([
    db
      .select()
      .from(stores)
      .where(eq(stores.organizationId, session.organizationId))
      .orderBy(asc(stores.createdAt)),
    getOrganization(),
  ]);

  const orgData = "error" in orgResult ? null : orgResult;
  const orgName = orgData?.name ?? "";
  const orgDocument = orgData?.document ?? "";
  const orgLogoUrl = orgData?.logoUrl ?? session.orgLogo ?? null;

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
          Configurações
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gerencie os dados, lojas e atributos da sua organização.
        </p>
      </div>

      <div className="grid gap-6">
        {/* CARD 1: DADOS DA EMPRESA (nome + logo + botão Editar) */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">
              Dados da empresa
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Nome e logo. Use Editar para alterar razão social e CNPJ (usado na NFC-e).
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <OrganizationCard
              orgName={orgName}
              orgDocument={orgDocument}
              orgLogoUrl={orgLogoUrl}
              isOwner={isOwner}
            />
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
              <div className="text-xs sm:text-sm text-muted-foreground italic">
                Você não tem permissão para gerenciar lojas.
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- CARD 3: CATEGORIAS --- */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg text-muted-foreground hidden sm:block">
                <Tag size={20} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">
                  Categorias de Produto
                </CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1">
                  Cadastre categorias como Camisa, Calça, Macacão para organizar
                  seus produtos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {canManageAttributes ? (
              <div className="flex items-center justify-between bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">
                  Crie e edite categorias de produtos.
                </div>
                <Link href="/settings/categories">
                  <Button
                    variant="outline"
                    className="gap-2 border-border hover:bg-background hover:text-primary"
                  >
                    Gerenciar Categorias
                    <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-muted-foreground italic">
                Apenas gerentes e donos podem configurar categorias.
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- CARD 4: ATRIBUTOS DE PRODUTO --- */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary hidden sm:block">
                <Palette size={20} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">
                  Atributos de Produto
                </CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1">
                  Cadastre opções de <strong>Cores</strong> e{" "}
                  <strong>Tamanhos</strong> para usar nas variações dos seus
                  produtos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {canManageAttributes ? (
              <div className="flex items-center justify-between bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">
                  Gerencie a paleta de cores e grade de tamanhos.
                </div>
                <Link href="/settings/attributes">
                  <Button
                    variant="outline"
                    className="gap-2 border-border hover:bg-background hover:text-primary"
                  >
                    Gerenciar Atributos
                    <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-muted-foreground italic">
                Apenas gerentes e donos podem configurar atributos.
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- CARD 5: NOTA FISCAL (NFC-e) --- */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary hidden sm:block">
                <FileText size={20} />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">
                  Nota Fiscal ao Consumidor (NFC-e)
                </CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1">
                  Certificado digital e código CSC: em poucos passos o Vestra passa a emitir
                  suas NFC-e nas vendas. Quem não emite nota pode deixar desativado.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {canManageAttributes ? (
              <div className="flex items-center justify-between bg-muted p-4 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground">
                  Certificado digital (.pfx), senha e código CSC.
                </div>
                <Link href="/settings/invoice">
                  <Button
                    variant="outline"
                    className="gap-2 border-border hover:bg-background hover:text-primary"
                  >
                    Configurar em 3 passos
                    <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-muted-foreground italic">
                Apenas gerentes e donos podem configurar emissão de nota fiscal.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
