import { getUserSession } from "@/lib/get-user-session";
import { db } from "@/db";
import { members, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NewMemberDialog } from "./new-member-dialog";
import { DeleteMemberButton } from "@/components/delete-member-button";

export default async function TeamPage() {
  const session = await getUserSession();

  const teamMembers = await db
    .select({
      userId: members.userId,
      role: members.role,
      name: profiles.name,
      email: profiles.email,
    })
    .from(members)
    .innerJoin(profiles, eq(members.userId, profiles.id))
    .where(eq(members.organizationId, session.organizationId));

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
            Equipe
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Gerencie quem tem acesso ao sistema.
          </p>
        </div>
        {["owner", "manager"].includes(session.role) && <NewMemberDialog />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((member) => {
          const isSelf = member.userId === session.user.id;
          const isTargetOwner = member.role === "owner";
          const canDelete =
            ["owner", "manager"].includes(session.role) &&
            !isTargetOwner &&
            !isSelf;

          return (
            <Card
              key={member.userId}
              className="overflow-hidden group relative"
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">
                    {member.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col min-w-0">
                  <CardTitle className="text-sm sm:text-base truncate pr-6">
                    {member.name}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm truncate">
                    {member.email}
                  </CardDescription>
                </div>

                {canDelete && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <DeleteMemberButton userId={member.userId!} />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-2">
                  <Badge
                    variant={member.role === "owner" ? "default" : "secondary"}
                    className="text-xs sm:text-sm"
                  >
                    {translateRole(member.role!)}
                  </Badge>
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
