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
          <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            Menu Principal <span className="text-slate-300">/</span>{" "}
            <span className="text-slate-900 font-semibold">Clientes</span>
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            Clientes
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {(hasClients || query) && <ClientFilter />}
          {(hasClients || query) && <ModalCadastro />}
        </div>
      </div>

      {!hasClients && !query ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl sm:rounded-2xl bg-white/50 space-y-4 p-6 sm:p-12">
          <div className="bg-slate-100 p-4 sm:p-6 rounded-2xl text-slate-400">
            <Users size={40} className="sm:w-12 sm:h-12" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
              Nenhum cliente cadastrado
            </h3>
            <p className="text-slate-500 text-sm sm:text-base max-w-xs">
              Comece adicionando seus clientes para gerenciar as vendas.
            </p>
          </div>
          <ModalCadastro centralizado />
        </div>
      ) : (
        <div className="space-y-4 w-full">
          <div className="hidden md:block bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4 pl-6">
                    Nome / Razão Social
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                    CPF / CNPJ
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                    E-mail
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
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
                      className="h-24 text-center text-slate-500"
                    >
                      Nenhum resultado encontrado para &quot;{query}&quot;
                    </TableCell>
                  </TableRow>
                ) : (
                  allClients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="hover:bg-slate-50/50 transition-colors border-slate-50"
                    >
                      <TableCell className="font-medium text-slate-700 py-4 pl-6">
                        {client.name}
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {client.type === "PJ"
                          ? normalizeCnpj(client.document)
                          : normalizeCpf(client.document)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {client.email || "-"}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
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
              <div className="text-center py-8 text-slate-500">
                Nenhum resultado encontrado para &quot;{query}&quot;
              </div>
            ) : (
              allClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm break-words">
                        {client.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">
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
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        E-mail
                      </p>
                      <p className="text-sm text-slate-700 break-all">
                        {client.email || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Telefone
                      </p>
                      <p className="text-sm text-slate-700">
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
          className={`${centralizado ? "px-8 py-6 text-lg" : "px-4"} bg-[#1a1a1a] hover:bg-black text-white gap-2 transition-all`}
        >
          <Plus size={centralizado ? 22 : 18} />
          {centralizado ? "Adicionar Cliente" : "Novo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white">
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
