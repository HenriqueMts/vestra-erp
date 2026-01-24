"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createClientAction } from "../actions";

import {
  normalizeCnpj,
  normalizeCpf,
  normalizePhoneNumber,
} from "@/utils/mask";

export function ClientForm({
  onSuccess,
}: Readonly<{ onSuccess?: () => void }>) {
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [type, setType] = useState<"PF" | "PJ">("PF");

  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);

    const result = await createClientAction(formData);

    setIsPending(false);

    if (result.success) {
      toast.success(result.message);
      if (onSuccess) onSuccess();
    } else {
      toast.error("Erro ao cadastrar", {
        description: result.message,
        duration: 5000,
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(normalizePhoneNumber(e.target.value));
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDocument(type === "PF" ? normalizeCpf(value) : normalizeCnpj(value));
  };

  return (
    <form action={handleSubmit} className="space-y-4 pt-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome / Razão Social</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="João Silva ou Empresa LTDA"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type">Tipo de Cliente</Label>
        <Select
          name="type"
          defaultValue="PF"
          onValueChange={(val) => {
            setType(val as "PF" | "PJ");
            setDocument("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
            <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="document">{type === "PF" ? "CPF" : "CNPJ"}</Label>
          <Input
            id="document"
            name="document"
            required
            placeholder={
              type === "PF" ? "000.000.000-00" : "00.000.000/0000-00"
            }
            value={document}
            onChange={handleDocumentChange}
            maxLength={type === "PF" ? 14 : 18}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={handlePhoneChange}
            maxLength={15}
          />
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
          disabled={isPending}
        >
          {isPending ? "Salvando..." : "Salvar Cliente"}
        </Button>
      </div>
    </form>
  );
}
