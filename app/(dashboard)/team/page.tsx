import { getUserSession } from "@/lib/get-user-session";
import { db } from "@/db";
import { members, profiles, stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { InviteModal } from "./invite-modal";
import { MapPin, ShieldAlert } from "lucide-react";
import { DeleteMemberButton } from "@/components/delete-member-button";

export default async function TeamPage() {
  const session = await getUserSession();

  if (!session) redirect("/login");

  // 1. Buscar Lojas (para o modal de convite)
  const organizationStores = await db
    .select({ id: stores.id, name: stores.name })
    .from(stores)
    .where(eq(stores.organizationId, session.organizationId));

  // 2. Buscar Membros (com Left Join para pegar convites pendentes)
  const teamMembers = await db
    .select({
      id: members.id, // ID da linha na tabela members (para deletar)
      userId: members.userId,
      role: members.role,
      email: members.email, // Email do convite
      profileName: profiles.name, // Nome se já tiver cadastro
      profileEmail: profiles.email,
      storeName: stores.name, // Nome da loja vinculada
    })
    .from(members)
    .leftJoin(profiles, eq(members.userId, profiles.id)) // Left join para trazer quem não tem perfil ainda
    .leftJoin(stores, eq(members.defaultStoreId, stores.id)) // Join para pegar nome da loja
    .where(eq(members.organizationId, session.organizationId));

  const isManagerOrOwner = ["owner", "manager"].includes(session.role);

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
            Equipe
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Gerencie quem tem acesso ao sistema e suas lojas.
          </p>
        </div>

        {/* Passamos as lojas para o Modal */}
        {isManagerOrOwner && <InviteModal stores={organizationStores} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((member) => {
          const isSelf = member.userId === session.user.id;
          const isTargetOwner = member.role === "owner";

          // Regra de deleção: Gerente/Dono pode deletar, menos a si mesmo e menos o Dono
          const canDelete = isManagerOrOwner && !isTargetOwner && !isSelf;

          // Dados de exibição (fallback para convidados pendentes)
          const displayName = member.profileName || "Convidado (Pendente)";
          const displayEmail = member.profileEmail || member.email;
          const initials = (
            displayName[0] ||
            displayEmail[0] ||
            "?"
          ).toUpperCase();

          return (
            <Card
              key={member.id}
              className={`overflow-hidden group relative transition-all hover:shadow-md ${
                !member.userId
                  ? "border-dashed border-slate-300 bg-slate-50/50"
                  : ""
              }`}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarFallback className="bg-white text-slate-700 font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col min-w-0">
                  <CardTitle className="text-sm sm:text-base truncate pr-6 font-medium text-slate-900">
                    {displayName}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm truncate">
                    {displayEmail}
                  </CardDescription>
                </div>

                {canDelete && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <DeleteMemberButton memberId={member.id} />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        member.role === "owner" ? "default" : "secondary"
                      }
                      className="text-[10px] sm:text-xs"
                    >
                      {translateRole(member.role!)}
                    </Badge>

                    {/* Status Pendente */}
                    {!member.userId && (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        Aguardando Aceite
                      </span>
                    )}
                  </div>

                  {/* Loja real do funcionário (defaultStoreId), não matriz por padrão */}
                  {member.storeName ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin size={12} />
                      <span className="truncate" title={member.storeName}>
                        Loja: {member.storeName}
                      </span>
                    </div>
                  ) : null}

                  {/* Se for vendedor mas sem loja */}
                  {member.role === "seller" && !member.storeName && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-500 mt-1">
                      <ShieldAlert size={12} />
                      <span>Sem loja fixa</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function translateRole(role: string) {
  const map: Record<string, string> = {
    owner: "Dono",
    manager: "Gerente",
    seller: "Vendedor",
  };
  return map[role] || role;
}
