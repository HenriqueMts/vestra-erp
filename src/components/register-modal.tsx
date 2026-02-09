"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductForm } from "@/components/product-form";
import type { ProductOptions } from "@/types/product";

interface registerModal {
  centralizado?: boolean;
  options: ProductOptions;
  organizationId: string;
}

export function RegisterModal({
  centralizado = false,
  options,
  organizationId,
}: Readonly<registerModal>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className={`${
            centralizado
              ? "px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg"
              : "px-3 sm:px-4 text-sm sm:text-base"
          } bg-[#1a1a1a] hover:bg-black text-white gap-2 transition-all w-full sm:w-auto`}
        >
          <Plus
            className={centralizado ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4"}
          />
          {centralizado ? "Adicionar Produto" : "Novo"}
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[800px] lg:max-w-[900px] bg-white max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            Cadastrar Produto
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Preencha os dados, defina se é produto simples ou com variações
            (cor/tamanho) e estoque.
          </DialogDescription>
        </DialogHeader>

        <ProductForm
          options={options}
          organizationId={organizationId}
          setOpen={setIsOpen}
          onSuccess={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
