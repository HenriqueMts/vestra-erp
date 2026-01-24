import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RecentClientsProps {
  clients: {
    id: string;
    name: string;
    email: string | null;
    createdAt: Date | null;
  }[];
}

export function RecentClients({ clients }: RecentClientsProps) {
  if (clients.length === 0) {
    return (
      <div className="text-sm text-slate-500">Nenhum cliente recente.</div>
    );
  }

  return (
    <div className="space-y-8">
      {clients.map((client) => {
        // Gera iniciais
        const initials = client.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <div key={client.id} className="flex items-center">
            <Avatar className="h-9 w-9 bg-slate-100 border border-slate-200">
              <AvatarFallback className="text-slate-700 font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none text-slate-900">
                {client.name}
              </p>
              <p className="text-xs text-slate-500 max-w-[200px] truncate">
                {client.email || "Sem e-mail"}
              </p>
            </div>
            <div className="ml-auto font-medium text-xs text-slate-400">
              {/* Formata data: 24/01 */}
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
