"use client";

import { useState } from "react";
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
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateMemberStore, deleteMember } from "@/actions/members";

interface TeamMemberRowActionsProps {
  memberId: string;
  memberName: string;
  currentStoreId: string | null;
  stores: { id: string; name: string }[];
  canDelete: boolean;
}

export function TeamMemberRowActions({
  memberId,
  memberName,
  currentStoreId,
  stores,
  canDelete,
}: Readonly<TeamMemberRowActionsProps>) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(currentStoreId || "");

  const handleSaveEdit = async () => {
    if (!selectedStoreId) {
      toast.error("Selecione uma loja.");
      return;
    }

    setEditLoading(true);
    try {
      const result = await updateMemberStore(memberId, selectedStoreId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message);
        setIsEditOpen(false);
      }
    } catch {
      toast.error("Erro ao atualizar loja.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const result = await deleteMember(memberId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Membro removido com sucesso.");
        setIsDeleteOpen(false);
      }
    } catch {
      toast.error("Erro ao remover membro.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs">Ações</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => {
              setSelectedStoreId(currentStoreId || "");
              setIsEditOpen(true);
            }}
            className="cursor-pointer gap-2 text-sm"
          >
            <Pencil className="h-4 w-4" /> Editar Loja
          </DropdownMenuItem>
          
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteOpen(true)}
                className="cursor-pointer gap-2 text-destructive text-sm"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
            <DialogDescription>
              Alterar a loja padrão de {memberName}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="store">Loja</Label>
              <Select
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
              >
                <SelectTrigger id="store">
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={editLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={editLoading || !selectedStoreId || selectedStoreId === currentStoreId}
            >
              {editLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente o
              acesso deste usuário ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
            >
              {deleteLoading ? "Removendo..." : "Sim, remover usuário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
