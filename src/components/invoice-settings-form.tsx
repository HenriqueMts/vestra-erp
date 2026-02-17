"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, FileText } from "lucide-react";
import { getInvoiceSettings, saveInvoiceSettings } from "@/actions/invoice";

type SettingsState = {
  isActive: boolean;
  providerToken: string;
  environment: string;
  cscId: string;
  cscToken: string;
  certificateId: string;
};

const defaultSettings: SettingsState = {
  isActive: false,
  providerToken: "",
  environment: "homologation",
  cscId: "",
  cscToken: "",
  certificateId: "",
};

export function InvoiceSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SettingsState>(defaultSettings);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getInvoiceSettings();
      if (cancelled) return;
      if (result.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      if (result.settings) {
        setForm({
          isActive: result.settings.isActive,
          providerToken: result.settings.providerToken ?? "",
          environment: result.settings.environment ?? "homologation",
          cscId: result.settings.cscId ?? "",
          cscToken: result.settings.cscToken ?? "",
          certificateId: result.settings.certificateId ?? "",
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await saveInvoiceSettings({
        isActive: form.isActive,
        providerToken: form.providerToken || undefined,
        environment: form.environment,
        cscId: form.cscId || undefined,
        cscToken: form.cscToken || undefined,
        certificateId: form.certificateId || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Configurações fiscais salvas.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-indigo-600" />
            Emissão de NFC-e (Focus NFe)
          </CardTitle>
          <CardDescription>
            Configure a integração com a Focus NFe para emitir Nota Fiscal ao Consumidor
            Eletrônica. Quem não emite nota pode deixar desativado e usar apenas o cupom
            não fiscal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div>
              <Label htmlFor="invoice-active" className="text-base font-medium text-slate-900">
                Habilitar emissão de NFC-e
              </Label>
              <p className="text-sm text-slate-500 mt-0.5">
                Quando ativo, o sistema emite nota fiscal ao finalizar vendas no PDV.
              </p>
            </div>
            <Switch
              id="invoice-active"
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-token">Token da API (Focus NFe)</Label>
            <Input
              id="provider-token"
              type="password"
              placeholder="Cole aqui o token de autenticação da Focus NFe"
              value={form.providerToken}
              onChange={(e) => setForm((f) => ({ ...f, providerToken: e.target.value }))}
              className="font-mono text-sm"
              autoComplete="off"
            />
            <p className="text-xs text-slate-500">
              Obtido no painel da Focus NFe em Integrações &gt; Tokens.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">Ambiente</Label>
            <Select
              value={form.environment}
              onValueChange={(v) => setForm((f) => ({ ...f, environment: v }))}
            >
              <SelectTrigger id="environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homologation">Homologação (testes)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Use homologação para testar; produção para notas reais.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="csc-id">CSC ID (NFC-e)</Label>
              <Input
                id="csc-id"
                type="text"
                placeholder="Código de Segurança do Contribuinte (ID)"
                value={form.cscId}
                onChange={(e) => setForm((f) => ({ ...f, cscId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="csc-token">CSC Token (NFC-e)</Label>
              <Input
                id="csc-token"
                type="password"
                placeholder="Hash do CSC"
                value={form.cscToken}
                onChange={(e) => setForm((f) => ({ ...f, cscToken: e.target.value }))}
                autoComplete="off"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            CSC é informado pela SEFAZ do seu estado para emissão de NFC-e.
          </p>

          <div className="space-y-2">
            <Label htmlFor="certificate-id">ID do Certificado Digital (opcional)</Label>
            <Input
              id="certificate-id"
              type="text"
              placeholder="Identificador do certificado no provedor"
              value={form.certificateId}
              onChange={(e) => setForm((f) => ({ ...f, certificateId: e.target.value }))}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
