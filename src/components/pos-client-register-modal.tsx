"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient, findClientByDocument } from "@/actions/clients";
import {
  normalizeCnpj,
  normalizeCpf,
  normalizePhoneNumber,
} from "@/utils/mask";
import { toast } from "sonner";

export type PosClient = {
  id: string;
  name: string;
  document: string;
  type: string;
  email: string | null;
  phone: string | null;
};

interface PosClientRegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDocument: string;
  onSuccess: (client: PosClient) => void;
}

export function PosClientRegisterModal({
  open,
  onOpenChange,
  defaultDocument,
  onSuccess,
}: PosClientRegisterModalProps) {
  const docLen = defaultDocument.replace(/\D/g, "").length;
  const [type, setType] = useState<"PF" | "PJ">(docLen === 14 ? "PJ" : "PF");
  const [document, setDocument] = useState(defaultDocument);
  const [phone, setPhone] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      setDocument(defaultDocument);
      setType(defaultDocument.replace(/\D/g, "").length === 14 ? "PJ" : "PF");
    }
  }, [open, defaultDocument]);

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDocument(type === "PF" ? normalizeCpf(value) : normalizeCnpj(value));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("type", type);
    setIsPending(true);
    const result = await createClient({}, formData);
    setIsPending(false);
    if (result.success && result.client) {
      toast.success(result.message);
      onSuccess(result.client as PosClient);
      onOpenChange(false);
      return;
    }
    if (result.success && !result.client) {
      const client = await findClientByDocument(document);
      if (client) {
        toast.success(result.message);
        onSuccess({
          id: client.id,
          name: client.name,
          document: client.document,
          type: client.type,
          email: client.email,
          phone: client.phone,
        });
        onOpenChange(false);
        return;
      }
    }
    toast.error(result.message ?? "Erro ao cadastrar");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar cliente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cliente não encontrado. Preencha os dados para cadastrar e continuar a
          venda.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="pos-client-name">Nome / Razão Social</Label>
            <Input
              id="pos-client-name"
              name="name"
              required
              placeholder="João Silva ou Empresa LTDA"
              className="text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as "PF" | "PJ")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">CPF</SelectItem>
                <SelectItem value="PJ">CNPJ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pos-client-doc">{type === "PF" ? "CPF" : "CNPJ"}</Label>
            <Input
              id="pos-client-doc"
              name="document"
              required
              value={document}
              onChange={handleDocumentChange}
              placeholder={type === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
              maxLength={type === "PF" ? 14 : 18}
              className="text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pos-client-phone">Telefone</Label>
            <Input
              id="pos-client-phone"
              name="phone"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(normalizePhoneNumber(e.target.value))}
              maxLength={15}
              className="text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pos-client-email">E-mail</Label>
            <Input
              id="pos-client-email"
              name="email"
              type="email"
              placeholder="cliente@email.com"
              className="text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-slate-900"
              disabled={isPending}
            >
              {isPending ? "Salvando..." : "Cadastrar e continuar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
