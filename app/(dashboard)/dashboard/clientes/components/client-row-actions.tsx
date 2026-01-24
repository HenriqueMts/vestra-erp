"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Mail,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ClientForm } from "./client-form";
import { deleteClientAction } from "../actions";

// Estendemos a interface para receber todos os dados necessários para edição
interface ClientRowActionsProps {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string;
  type: "PF" | "PJ" | string;
}

export function ClientRowActions({
  id,
  name,
  email,
  phone,
  document,
  type,
}: Readonly<ClientRowActionsProps>) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleSendEmail = () => {
    if (!email) return toast.error("Sem e-mail cadastrado.");
    window.open(`mailto:${email}`, "_blank");
  };

  const handleWhatsApp = () => {
    if (!phone) return toast.error("Sem telefone cadastrado.");
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return toast.error("Número inválido.");
    const finalPhone = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;
    const message = encodeURIComponent(`Olá ${name}, tudo bem?`);
    window.open(`https://wa.me/${finalPhone}?text=${message}`, "_blank");
  };

  const handleDelete = async () => {
    const result = await deleteClientAction(id);
    if (result.success) {
      toast.success(result.message);
      setIsDeleteOpen(false);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <>
      {/* Dropdown Menu Principal */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>

          <DropdownMenuItem
            onClick={handleSendEmail}
            className="cursor-pointer gap-2"
          >
            <Mail className="h-4 w-4 text-slate-500" /> Enviar E-mail
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleWhatsApp}
            className="cursor-pointer gap-2"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setIsEditOpen(true)}
            className="cursor-pointer gap-2"
          >
            <Pencil className="h-4 w-4 text-blue-600" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
            className="cursor-pointer gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias nos dados de {name}.
            </DialogDescription>
          </DialogHeader>
          {/* Passamos os dados atuais para preencher o form */}
          <ClientForm
            initialData={{ id, name, email, phone, document, type }}
            onSuccess={() => setIsEditOpen(false)} // Fecha modal ao salvar
          />
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o
              cliente
              <span className="font-bold text-slate-900"> {name} </span>e
              removerá seus dados dos nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, excluir cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
