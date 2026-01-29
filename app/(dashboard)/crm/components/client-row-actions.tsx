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

import { deleteClient } from "@/actions/clients";

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

    const finalPhone =
      cleanPhone.startsWith("55") && cleanPhone.length > 11
        ? cleanPhone
        : `55${cleanPhone}`;

    const message = encodeURIComponent(`Olá ${name}, tudo bem?`);
    window.open(`https://wa.me/${finalPhone}?text=${message}`, "_blank");
  };

  const handleDelete = async () => {
    const result = await deleteClient(id);

    if (result.success) {
      toast.success(result.message);
      setIsDeleteOpen(false);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-slate-100"
            title="Mais ações"
          >
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 sm:w-56">
          <DropdownMenuLabel className="text-xs sm:text-sm">
            Ações
          </DropdownMenuLabel>

          <DropdownMenuItem
            onClick={handleSendEmail}
            className="cursor-pointer gap-2 text-xs sm:text-sm"
          >
            <Mail className="h-4 w-4 text-slate-500 shrink-0" /> Enviar E-mail
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleWhatsApp}
            className="cursor-pointer gap-2 text-xs sm:text-sm"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0" />{" "}
            WhatsApp
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setIsEditOpen(true)}
            className="cursor-pointer gap-2 text-xs sm:text-sm text-blue-600 focus:text-blue-700 focus:bg-blue-50"
          >
            <Pencil className="h-4 w-4 shrink-0" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
            className="cursor-pointer gap-2 text-xs sm:text-sm text-red-600 focus:text-red-700 focus:bg-red-50"
          >
            <Trash2 className="h-4 w-4 shrink-0" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Editar Cliente
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Faça as alterações necessárias nos dados de {name}.
            </DialogDescription>
          </DialogHeader>

          <ClientForm
            initialData={{ id, name, email, phone, document, type }}
            onSuccess={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white w-[95vw] sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">
              Você tem certeza?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o
              cliente
              <span className="font-bold text-slate-900"> {name} </span>e
              removerá seus dados dos nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="text-xs sm:text-sm ">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="ml-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm"
            >
              Sim, excluir cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
