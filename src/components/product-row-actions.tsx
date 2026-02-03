"use client";

// ... (imports iguais, sem mudança)
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { ProductForm } from "./product-form";
import { deleteProduct } from "@/actions/products";

interface ProductRowActionsProps {
  id: string;
  name: string;
  basePrice: number;
  categoryId: string | null;
  description: string | null;
  imageUrl: string | null;
  // Adicionar Status aqui
  status: "active" | "inactive" | "archived" | null;
  images?: { id: string; url: string; order: number | null }[];
  organizationId: string;
  categories: { id: string; name: string }[];
}

export function ProductRowActions({
  id,
  name,
  basePrice,
  categoryId,
  description,
  imageUrl,
  status, // Recebe status
  images = [],
  organizationId,
  categories,
}: Readonly<ProductRowActionsProps>) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const result = await deleteProduct(id, organizationId);
    if (result.success) {
      toast.success("Produto deletado!");
      setIsDeleteOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <DropdownMenu>
        {/* ... (Menu Dropdown igual) ... */}
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 sm:w-56">
          <DropdownMenuLabel className="text-xs sm:text-sm">
            Ações
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => setIsEditOpen(true)}
            className="cursor-pointer gap-2 text-blue-600"
          >
            <Pencil className="h-4 w-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
            className="cursor-pointer gap-2 text-red-600"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>Alterar dados de {name}.</DialogDescription>
          </DialogHeader>

          <ProductForm
            organizationId={organizationId}
            categories={categories}
            initialData={{
              id,
              name,
              basePrice,
              categoryId: categoryId ?? "",
              description: description ?? "",
              imageUrl: imageUrl ?? null,
              status: status, // Passa o status para o form
              images: images,
            }}
            onSuccess={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ... (Modal de Exclusão igual) ... */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente {name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
