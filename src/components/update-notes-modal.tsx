"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const STORAGE_KEY = "jilem-modas-seen-update";

/** Altere esta versão quando publicar novas notas; quem ainda não viu verá o modal. */
const CURRENT_VERSION = "2025-02-10";

const UPDATES: { title: string; items: string[] }[] = [
  {
    title: "Checkout (POS)",
    items: [
      "Layout do modal de checkout ajustado: nome do cliente não fica mais sobre o botão.",
    ],
  },
  {
    title: "Caixa",
    items: [
      "Abertura automática do caixa à meia-noite para facilitar o controle diário.",
    ],
  },
  {
    title: "POS e estoque",
    items: [
      "POS vinculado à loja/estoque selecionado.",
      "Estoque atualizado corretamente ao concluir uma venda.",
      "Quantidade exibida no card do POS reflete o estoque real.",
    ],
  },
  {
    title: "Equipe",
    items: [
      "Exibição da loja real do funcionário no time.",
    ],
  },
  {
    title: "Produtos",
    items: [
      "Correções no cadastro de variantes de cor.",
    ],
  },
  {
    title: "POS responsivo",
    items: [
      "Melhorias de uso em telas menores.",
    ],
  },
  {
    title: "Dashboard",
    items: [
      "Aviso de estoque baixo corrigido.",
    ],
  },
  {
    title: "Transferência e movimentação",
    items: [
      "Transferência de produtos entre lojas.",
      "Troca no POS: devolução de qualquer produto (entrada no estoque) e saída do produto da troca (com controle de estoque).",
    ],
  },
];

export function UpdateNotesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (globalThis.window === undefined) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== CURRENT_VERSION) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (globalThis.window !== undefined) {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton={true}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl">O que há de novo</DialogTitle>
          </div>
          <DialogDescription>
            Confira as últimas atualizações, correções e melhorias no sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto rounded-md border bg-slate-50/80 p-3 text-sm">
          <ul className="space-y-4">
            {UPDATES.map((section) => (
              <li key={section.title}>
                <h4 className="font-semibold text-slate-800">{section.title}</h4>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-slate-600">
                  {section.items.map((item) => (
                    <li key={`${section.title}-${item}`}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
