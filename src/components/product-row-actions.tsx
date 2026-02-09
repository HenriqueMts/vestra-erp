"use client";

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
import type { ProductOptions, ProductInitialData } from "@/types/product";

interface ProductRowActionsProps {
  id: string;
  name: string;
  basePrice: number;
  categoryId: string | null;
  description: string | null;
  imageUrl: string | null;
  status: "active" | "inactive" | "archived" | null;
  images?: Array<{ id: string; url: string; order: number | null }>;
  inventory?: Array<{ id: string; storeId: string; quantity: number }>;
  variants?: Array<{
    id: string;
    sku: string;
    colorId: string | null;
    sizeId: string | null;
    inventory: Array<{ id: string; storeId: string; quantity: number }>;
  }>;
  organizationId: string;
  options: ProductOptions;
}

export function ProductRowActions({
  id,
  name,
  basePrice,
  categoryId,
  description,
  imageUrl,
  status,
  images = [],
  inventory = [],
  variants = [],
  organizationId,
  options,
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

  const initialData: ProductInitialData = {
    id,
    name,
    basePrice,
    categoryId: categoryId ?? "",
    description: description ?? "",
    imageUrl: imageUrl ?? null,
    status: status ?? "active",
    images,
    inventory,
    variants,
  };

  return (
    <>
      <DropdownMenu>
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
            className="cursor-pointer gap-2 text-blue-600 text-sm"
          >
            <Pencil className="h-4 w-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
            className="cursor-pointer gap-2 text-red-600 text-sm"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[800px] lg:max-w-[900px] bg-white max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">
              Editar Produto
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Alterar dados de {name}.
            </DialogDescription>
          </DialogHeader>

          <ProductForm
            organizationId={organizationId}
            options={options}
            initialData={initialData}
            onSuccess={() => setIsEditOpen(false)}
            setOpen={setIsEditOpen}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-white w-[90vw] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">
              Você tem certeza?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Isso excluirá permanentemente {name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white w-full sm:w-auto"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
