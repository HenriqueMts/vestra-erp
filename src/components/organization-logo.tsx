import { getUserSession } from "@/lib/get-user-session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export async function OrganizationLogo() {
  const session = await getUserSession();

  const initials = session.orgName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 px-2 mb-6">
      <Avatar className="h-10 w-10 border border-slate-200 rounded-lg">
        <AvatarImage
          src={session.orgLogo || ""}
          alt={session.orgName}
          className="object-cover"
        />
        <AvatarFallback className="rounded-lg bg-indigo-600 text-white font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="font-bold text-sm text-slate-900 leading-tight">
          {session.orgName}
        </span>
        <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
          Plano {session.role === "owner" ? "Enterprise" : "Membro"}
        </span>
      </div>
    </div>
  );
}
