import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RecentClientsProps {
  clients: {
    id: string;
    name: string;
    email: string | null;
    createdAt: Date | null;
  }[];
}

export function RecentClients({ clients }: Readonly<RecentClientsProps>) {
  if (clients.length === 0) {
    return (
      <div className="text-xs sm:text-sm text-slate-500">
        Nenhum cliente recente.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      {clients.map((client) => {
        const initials = client.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <div
            key={client.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
          >
            <Avatar className="h-9 w-9 bg-slate-100 border border-slate-200 shrink-0">
              <AvatarFallback className="text-slate-700 font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium leading-none text-slate-900 wrap-break-word">
                {client.name}
              </p>
              <p className="text-xs text-slate-500 sm:max-w-50 truncate">
                {client.email || "Sem e-mail"}
              </p>
            </div>
            <div className="text-xs text-slate-400 font-medium shrink-0">
              {client.createdAt
                ? new Date(client.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })
                : "-"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
