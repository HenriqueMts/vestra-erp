import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm"; // Adicionado sql
import { createClient } from "@/utils/supabase/server";
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
import { ClientPagination } from "./components/client-pagination"; // Novo Componente

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const whereConditions = and(
    eq(clients.userId, user.id),
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
    limit: ITEMS_PER_PAGE, // Traz apenas 20
    offset: offset, // Pula os anteriores
  });

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(whereConditions);

  const totalItems = Number(countResult.count);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const hasClients = totalItems > 0;

  // Se tem busca ativa, não queremos mostrar o "Zero State", queremos mostrar "Nenhum resultado"
  const isFilteredEmpty = query.length > 0 && totalItems === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 min-h-[80vh] flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
            Menu Principal <span className="text-slate-300">/</span>{" "}
            <span className="text-slate-900">Clientes</span>
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Clientes
          </h1>
        </div>

        {/* Área de Ações: Filtro + Botão */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Só mostra o filtro se tiver clientes cadastrados OU se já estiver filtrando */}
          {(hasClients || query) && <ClientFilter />}
          {(hasClients || query) && <ModalCadastro />}
        </div>
      </div>

      {/* ESTADO VAZIO INICIAL (Sem clientes na conta e sem busca) */}
      {!hasClients && !query ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50 space-y-4 p-12">
          <div className="bg-slate-100 p-4 rounded-full text-slate-400">
            <Users size={48} />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-xl font-semibold text-slate-900">
              Nenhum cliente cadastrado
            </h3>
            <p className="text-slate-500 max-w-xs">
              Comece adicionando seus clientes para gerenciar as vendas.
            </p>
          </div>
          <ModalCadastro centralizado />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFilteredEmpty ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
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
                      <TableCell className="text-slate-500">
                        {client.email || "-"}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {normalizePhoneNumber(client.phone || "")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Adição da Paginação */}
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
