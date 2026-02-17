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

/** Altere esta versão quando publicar novas notas; quem ainda não viu verá o modal na próxima vez que logar. */
const CURRENT_VERSION = "2025-02-16";

const UPDATES: { title: string; items: string[] }[] = [
  {
    title: "Nota fiscal (NFC-e) para lojas optantes",
    items: [
      "Configuração em 3 passos: certificado digital A1, código CSC e ativação.",
      "Dados fiscais opcionais (IE, endereço) para cadastro na Focus.",
      "Cupom não fiscal sempre exibido após a venda; link da NFC-e no comprovante quando emitida.",
      "Seção de dados fiscais (NCM, CFOP, etc.) no cadastro de produtos apenas para quem emite nota.",
    ],
  },
  {
    title: "Edição de lojas e filiais",
    items: [
      "Agora é possível editar nome e endereço de cada loja.",
      "Botão “Editar” no card da loja abre um modal para alterar os dados.",
      "Matriz e filiais podem ser editadas; exclusão continua apenas para filiais.",
    ],
  },
  {
    title: "Edição de perfil da empresa",
    items: [
      "Novo botão “Editar” no card de dados da empresa (Configurações).",
      "Modal para alterar razão social e CNPJ da empresa.",
      "Upload do logo da empresa também dentro do mesmo modal.",
      "CNPJ é usado na NFC-e e em documentos fiscais.",
    ],
  },
  {
    title: "Outras melhorias",
    items: [
      "Checkout: comprovante (cupom não fiscal) exibido após finalizar a venda.",
      "Produtos: SKU preenchido na edição, com opção “Alterar código” para editar.",
      "Transferência entre lojas, troca/devolução no POS e controle de estoque por loja.",
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
        <div className="max-h-[50vh] overflow-y-auto rounded-md border bg-muted/80 p-3 text-sm">
          <ul className="space-y-4">
            {UPDATES.map((section) => (
              <li key={section.title}>
                <h4 className="font-semibold text-foreground">{section.title}</h4>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
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
