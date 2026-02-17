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
      <div className="text-xs sm:text-sm text-muted-foreground">
        Nenhum cliente recente.
      </div>
    );
  }

  return (
    <div className="max-h-[320px] overflow-y-auto space-y-4 sm:space-y-6 pr-1">
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
            <Avatar className="h-9 w-9 bg-muted border border-border shrink-0">
              <AvatarFallback className="text-foreground font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium leading-none text-foreground wrap-break-word">
                {client.name}
              </p>
              <p className="text-xs text-muted-foreground sm:max-w-50 truncate">
                {client.email || "Sem e-mail"}
              </p>
            </div>
            <div className="text-xs text-muted-foreground font-medium shrink-0">
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
