"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { updateOrganization } from "@/actions/organization";
import { normalizeCnpj } from "@/utils/mask";

interface OrganizationProfileFormProps {
  initialName: string;
  initialDocument: string;
  isOwner: boolean;
  /** Chamado após salvar com sucesso (ex.: fechar modal). */
  onSuccess?: () => void;
}

export function OrganizationProfileForm({
  initialName,
  initialDocument,
  isOwner,
  onSuccess,
}: Readonly<OrganizationProfileFormProps>) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [document, setDocument] = useState(() => {
    const digits = initialDocument.replaceAll(/\D/g, "");
    return digits.length === 14 ? normalizeCnpj(initialDocument) : initialDocument;
  });
  const [saving, setSaving] = useState(false);

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDocument(normalizeCnpj(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    setSaving(true);
    try {
      const result = await updateOrganization({
        name: name.trim(),
        document: document.trim() || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Dados da empresa atualizados.");
        router.refresh();
        onSuccess?.();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
        Apenas o dono da empresa pode alterar razão social e CNPJ.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-1 sm:max-w-md">
        <div className="space-y-2">
          <Label htmlFor="org-name">Razão social</Label>
          <Input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da empresa"
            className="bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-document">CNPJ</Label>
          <Input
            id="org-document"
            type="text"
            value={document}
            onChange={handleDocumentChange}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className="bg-white font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Importante para NFC-e e documentos fiscais.
          </p>
        </div>
      </div>
      <Button type="submit" disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
        Salvar dados da empresa
      </Button>
    </form>
  );
}
