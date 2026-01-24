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
import { createClientAction, updateClientAction } from "../actions";
import {
  normalizeCnpj,
  normalizeCpf,
  normalizePhoneNumber,
} from "@/utils/mask";

type ClientData = {
  id: string;
  name: string;
  type: "PF" | "PJ" | string;
  document: string;
  email: string | null;
  phone: string | null;
};

export function ClientForm({
  onSuccess,
  initialData,
}: Readonly<{ onSuccess?: () => void; initialData?: ClientData }>) {
  const [phone, setPhone] = useState(
    initialData?.phone ? normalizePhoneNumber(initialData.phone) : "",
  );
  const [document, setDocument] = useState(
    initialData?.document
      ? initialData.type === "PJ"
        ? normalizeCnpj(initialData.document)
        : normalizeCpf(initialData.document)
      : "",
  );
  const [type, setType] = useState<"PF" | "PJ">(
    (initialData?.type as "PF" | "PJ") || "PF",
  );
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);

    let result;

    if (initialData) {
      formData.append("id", initialData.id);
      result = await updateClientAction(formData);
    } else {
      result = await createClientAction(formData);
    }

    setIsPending(false);

    if (result.success) {
      toast.success(result.message);
      if (onSuccess) onSuccess();
    } else {
      toast.error(initialData ? "Erro ao atualizar" : "Erro ao cadastrar", {
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
        <Label htmlFor="name" className="text-sm font-medium">
          Nome / Razão Social
        </Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="João Silva ou Empresa LTDA"
          defaultValue={initialData?.name}
          className="text-base"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type" className="text-sm font-medium">
          Tipo de Cliente
        </Label>
        <Select
          name="type"
          value={type}
          onValueChange={(val) => {
            setType(val as "PF" | "PJ");
            if (val !== initialData?.type) setDocument("");
          }}
        >
          <SelectTrigger className="text-base">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
            <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="document" className="text-sm font-medium">
            {type === "PF" ? "CPF" : "CNPJ"}
          </Label>
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
            className="text-base"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone" className="text-sm font-medium">
            Telefone
          </Label>
          <Input
            id="phone"
            name="phone"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={handlePhoneChange}
            maxLength={15}
            className="text-base"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email" className="text-sm font-medium">
          E-mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="cliente@email.com"
          defaultValue={initialData?.email || ""}
          className="text-base"
        />
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          className="w-full bg-slate-900 text-white py-5 sm:py-6 text-sm sm:text-base"
          disabled={isPending}
        >
          {isPending
            ? "Salvando..."
            : initialData
              ? "Salvar Alterações"
              : "Cadastrar Cliente"}
        </Button>
      </div>
    </form>
  );
}
