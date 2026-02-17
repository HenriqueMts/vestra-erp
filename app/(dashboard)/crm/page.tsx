import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";

import { getUserSession } from "@/lib/get-user-session";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ClientForm } from "./components/client-form";
import {
  normalizeCnpj,
  normalizeCpf,
  normalizePhoneNumber,
} from "@/utils/mask";
import { ClientFilter } from "./components/client-filter";
import { ClientPagination } from "./components/client-pagination";
import { ClientRowActions } from "./components/client-row-actions";

const ITEMS_PER_PAGE = 20;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const queryParams = await searchParams;
  const query = queryParams?.q || "";

  const currentPage = Number(queryParams?.page) || 1;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const { organizationId } = await getUserSession();

  const whereConditions = and(
    eq(clients.organizationId, organizationId),
    query
      ? or(
          ilike(clients.name, `%${query}%`),
          ilike(clients.document, `%${query}%`),
          ilike(clients.email, `%${query}%`),
        )
      : undefined,
  );

  const allClients = await db.query.clients.findMany({
    where: whereConditions,
    orderBy: [desc(clients.createdAt)],
    limit: ITEMS_PER_PAGE,
    offset: offset,
  });

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(whereConditions);

  const totalItems = Number(countResult.count);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const hasClients = totalItems > 0;
  const isFilteredEmpty = query.length > 0 && totalItems === 0;

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-2 w-full sm:w-auto">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            Menu Principal <span className="text-muted-foreground">/</span>{" "}
            <span className="text-foreground font-semibold">Clientes</span>
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Clientes
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {(hasClients || query) && <ClientFilter />}
          {(hasClients || query) && <ModalCadastro />}
        </div>
      </div>

      {!hasClients && !query ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl sm:rounded-2xl bg-card/50 space-y-4 p-6 sm:p-12">
          <div className="bg-muted p-4 sm:p-6 rounded-2xl text-muted-foreground">
            <Users size={40} className="sm:w-12 sm:h-12" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">
              Nenhum cliente cadastrado
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xs">
              Comece adicionando seus clientes para gerenciar as vendas.
            </p>
          </div>
          <ModalCadastro centralizado />
        </div>
      ) : (
        <div className="space-y-4 w-full">
          <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-4 pl-6">
                    Nome / Razão Social
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-4">
                    CPF / CNPJ
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-4">
                    E-mail
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-4">
                    Telefone
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFilteredEmpty ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum resultado encontrado para &quot;{query}&quot;
                    </TableCell>
                  </TableRow>
                ) : (
                  allClients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="hover:bg-muted/50 transition-colors border-border"
                    >
                      <TableCell className="font-medium text-foreground py-4 pl-6">
                        {client.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {client.type === "PJ"
                          ? normalizeCnpj(client.document)
                          : normalizeCpf(client.document)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {client.email || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {normalizePhoneNumber(client.phone || "")}
                      </TableCell>
                      <TableCell>
                        <ClientRowActions
                          id={client.id}
                          name={client.name}
                          email={client.email}
                          phone={client.phone}
                          document={client.document}
                          type={client.type}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {isFilteredEmpty ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum resultado encontrado para &quot;{query}&quot;
              </div>
            ) : (
              allClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-card rounded-lg border border-border shadow-sm p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm break-words">
                        {client.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {client.type === "PJ"
                          ? normalizeCnpj(client.document)
                          : normalizeCpf(client.document)}
                      </p>
                    </div>
                    <ClientRowActions
                      id={client.id}
                      name={client.name}
                      email={client.email}
                      phone={client.phone}
                      document={client.document}
                      type={client.type}
                    />
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        E-mail
                      </p>
                      <p className="text-sm text-foreground break-all">
                        {client.email || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Telefone
                      </p>
                      <p className="text-sm text-foreground">
                        {normalizePhoneNumber(client.phone || "") || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <ClientPagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}

function ModalCadastro({
  centralizado = false,
}: Readonly<{ centralizado?: boolean }>) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={`${centralizado ? "px-8 py-6 text-lg" : "px-4"} bg-primary hover:bg-primary/90 text-primary-foreground gap-2 transition-all`}
        >
          <Plus size={centralizado ? 22 : 18} />
          {centralizado ? "Adicionar Cliente" : "Novo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Cadastrar Cliente
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo. O cliente será vinculado à sua loja.
          </DialogDescription>
        </DialogHeader>
        <ClientForm />
      </DialogContent>
    </Dialog>
  );
}
