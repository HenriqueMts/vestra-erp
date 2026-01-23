import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientAction } from "./actions";

export default async function ClientesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allClients = user
    ? await db.query.clients.findMany({ where: eq(clients.userId, user.id) })
    : [];

  const hasClients = allClients.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 min-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
            Menu Principal <span className="text-slate-300">/</span>{" "}
            <span className="text-slate-900">Clientes</span>
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Clientes
          </h1>
        </div>

        {hasClients && <ModalCadastro />}
      </div>

      {!hasClients ? (
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
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                  Nome
                </TableHead>
                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                  E-mail
                </TableHead>
                <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                  Número de Celular
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="hover:bg-slate-50/50 transition-colors border-slate-50"
                >
                  <TableCell className="font-medium text-slate-700 py-4">
                    {client.name}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {client.email}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {client.phone}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
function ModalCadastro({ centralizado = false }: { centralizado?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={`${centralizado ? "px-8 py-6 text-lg" : "px-6"} bg-[#1a1a1a] hover:bg-black text-white gap-2 transition-all`}
        >
          <Plus size={centralizado ? 22 : 18} />
          Adicionar Cliente
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
        <form action={createClientAction} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome / Razão Social</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="João Silva ou Empresa LTDA"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="document">CPF / CNPJ</Label>
              <Input
                id="document"
                name="document"
                required
                placeholder="000.000.000-00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="cliente@email.com"
            />
          </div>
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full bg-slate-900 text-white py-6"
            >
              Salvar Cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
