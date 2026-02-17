"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  FileCheck,
  Shield,
  Building2,
  ChevronRight,
  ChevronLeft,
  Upload,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import {
  getInvoiceSettings,
  saveInvoiceSettings,
  uploadCertificate,
  getOrganizationForInvoice,
} from "@/actions/invoice";

/** Links para o contribuinte obter o CSC na SEFAZ do estado (NFC-e). */
const SEFAZ_CSC_LINKS: { uf: string; label: string; url: string }[] = [
  { uf: "AC", label: "Acre", url: "https://sefaznet.ac.gov.br/" },
  { uf: "AL", label: "Alagoas", url: "https://sefaz.al.gov.br/" },
  { uf: "AM", label: "Amazonas", url: "https://sistemas.sefaz.am.gov.br/" },
  { uf: "BA", label: "Bahia", url: "https://nfe.sefaz.ba.gov.br/" },
  { uf: "CE", label: "Ceará", url: "https://nfe.sefaz.ce.gov.br/" },
  {
    uf: "DF",
    label: "Distrito Federal",
    url: "https://www.fazenda.df.gov.br/",
  },
  { uf: "ES", label: "Espírito Santo", url: "https://app.sefaz.es.gov.br/" },
  { uf: "GO", label: "Goiás", url: "https://nfe.sefaz.go.gov.br/" },
  { uf: "MA", label: "Maranhão", url: "https://nfe.ma.gov.br/" },
  { uf: "MG", label: "Minas Gerais", url: "https://nfe.fazenda.mg.gov.br/" },
  {
    uf: "MS",
    label: "Mato Grosso do Sul",
    url: "https://nfe.sefaz.ms.gov.br/",
  },
  { uf: "MT", label: "Mato Grosso", url: "https://nfe.sefaz.mt.gov.br/" },
  { uf: "PA", label: "Pará", url: "https://appnfe.sefa.pa.gov.br/" },
  { uf: "PB", label: "Paraíba", url: "https://nfe.sefaz.pb.gov.br/" },
  { uf: "PE", label: "Pernambuco", url: "https://nfe.sefaz.pe.gov.br/" },
  { uf: "PI", label: "Piauí", url: "https://nfe.sefaz.pi.gov.br/" },
  { uf: "PR", label: "Paraná", url: "https://nfe.sefa.pr.gov.br/" },
  { uf: "RJ", label: "Rio de Janeiro", url: "https://www4.fazenda.rj.gov.br/" },
  { uf: "RN", label: "Rio Grande do Norte", url: "https://nfe.set.rn.gov.br/" },
  { uf: "RO", label: "Rondônia", url: "https://nfe.sefin.ro.gov.br/" },
  { uf: "RR", label: "Roraima", url: "https://sistemas.sefa.rr.gov.br/" },
  { uf: "RS", label: "Rio Grande do Sul", url: "https://nfe.sefaz.rs.gov.br/" },
  { uf: "SC", label: "Santa Catarina", url: "https://nfe.sefaz.sc.gov.br/" },
  { uf: "SE", label: "Sergipe", url: "https://nfe.sefaz.se.gov.br/" },
  { uf: "SP", label: "São Paulo", url: "https://www.nfce.fazenda.sp.gov.br/" },
  { uf: "TO", label: "Tocantins", url: "https://nfe.sefa.to.gov.br/" },
];

const STEPS = [
  { id: 1, title: "Certificado digital", icon: FileCheck },
  { id: 2, title: "Código CSC", icon: Shield },
  { id: 3, title: "Dados da empresa", icon: Building2 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function InvoiceSettingsWizard() {
  const [step, setStep] = useState<StepId>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [uploadingCert, setUploadingCert] = useState(false);

  const [cscId, setCscId] = useState("");
  const [cscToken, setCscToken] = useState("");

  const [isActive, setIsActive] = useState(false);
  const [org, setOrg] = useState<{ name: string; document: string } | null>(
    null,
  );

  const [settings, setSettings] = useState<{
    certificateId: string | null;
    certificateStatus: string | null;
    cscId: string;
    cscToken: string;
    isActive: boolean;
    ie: string;
    im: string;
    regimeTributario: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
  } | null>(null);

  const [fiscalData, setFiscalData] = useState({
    ie: "",
    im: "",
    regimeTributario: "1",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    municipio: "",
    uf: "",
  });

  const loadData = useCallback(async () => {
    const [settingsRes, orgRes] = await Promise.all([
      getInvoiceSettings(),
      getOrganizationForInvoice(),
    ]);

    if (settingsRes.error) {
      toast.error(settingsRes.error);
      setLoading(false);
      return;
    }
    if ("error" in orgRes) {
      toast.error(orgRes.error);
      setLoading(false);
      return;
    }

    setOrg(orgRes);
    if (settingsRes.settings) {
      const s = settingsRes.settings;
      setSettings({
        certificateId: s.certificateId ?? null,
        certificateStatus: s.certificateStatus ?? null,
        cscId: s.cscId ?? "",
        cscToken: s.cscToken ?? "",
        isActive: s.isActive,
        ie: s.ie ?? "",
        im: s.im ?? "",
        regimeTributario: s.regimeTributario ?? "1",
        cep: s.cep ?? "",
        logradouro: s.logradouro ?? "",
        numero: s.numero ?? "",
        complemento: s.complemento ?? "",
        bairro: s.bairro ?? "",
        municipio: s.municipio ?? "",
        uf: s.uf ?? "",
      });
      setCscId(s.cscId ?? "");
      setCscToken(s.cscToken ?? "");
      setIsActive(s.isActive);
      setFiscalData({
        ie: s.ie ?? "",
        im: s.im ?? "",
        regimeTributario: s.regimeTributario ?? "1",
        cep: s.cep ?? "",
        logradouro: s.logradouro ?? "",
        numero: s.numero ?? "",
        complemento: s.complemento ?? "",
        bairro: s.bairro ?? "",
        municipio: s.municipio ?? "",
        uf: s.uf ?? "",
      });
    } else {
      setSettings(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCertificateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !certificateFile?.name?.toLowerCase().endsWith(".pfx") &&
      !certificateFile?.name?.toLowerCase().endsWith(".p12")
    ) {
      toast.error("Envie um arquivo de certificado digital (.pfx ou .p12).");
      return;
    }
    if (!certificatePassword.trim()) {
      toast.error("Informe a senha do certificado.");
      return;
    }

    setUploadingCert(true);
    try {
      const saveFiscal = await saveInvoiceSettings({
        ie: fiscalData.ie,
        im: fiscalData.im,
        regimeTributario: fiscalData.regimeTributario,
        cep: fiscalData.cep,
        logradouro: fiscalData.logradouro,
        numero: fiscalData.numero,
        complemento: fiscalData.complemento,
        bairro: fiscalData.bairro,
        municipio: fiscalData.municipio,
        uf: fiscalData.uf,
      });
      if (saveFiscal.error) {
        toast.error(saveFiscal.error);
        return;
      }

      const formData = new FormData();
      formData.set("certificate", certificateFile);
      formData.set("password", certificatePassword);
      const result = await uploadCertificate(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Certificado cadastrado com sucesso.");
      setCertificateFile(null);
      setCertificatePassword("");
      await loadData();
      setStep(2);
    } finally {
      setUploadingCert(false);
    }
  };

  const handleCscSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cscId.trim() || !cscToken.trim()) {
      toast.error("Preencha o ID e o Código do CSC.");
      return;
    }
    setSaving(true);
    try {
      const result = await saveInvoiceSettings({
        cscId: cscId.trim(),
        cscToken: cscToken.trim(),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("CSC salvo.");
      await loadData();
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const result = await saveInvoiceSettings({ isActive: true });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        "Emissão de NFC-e ativada. Suas vendas poderão gerar nota fiscal.",
      );
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    setIsActive(checked);
    const result = await saveInvoiceSettings({ isActive: checked });
    if (result.error) toast.error(result.error);
    else
      toast.success(
        checked ? "Emissão de NFC-e ativada." : "Emissão de NFC-e desativada.",
      );
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Indicador de passos */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isCurrent = step === s.id;
          const step1Done =
            settings?.certificateStatus === "valid" ||
            !!settings?.certificateId;
          const step2Done = !!(settings?.cscId && settings?.cscToken);
          const isDone =
            step > s.id ||
            (s.id === 1 && step1Done) ||
            (s.id === 2 && step2Done);
          let stepButtonClass = "text-slate-400";
          if (isCurrent) stepButtonClass = "bg-indigo-100 text-indigo-800";
          else if (isDone)
            stepButtonClass = "bg-slate-100 text-slate-700 hover:bg-slate-200";
          return (
            <div key={s.id} className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${stepButtonClass}`}
              >
                <span className="hidden sm:inline">{s.title}</span>
                {isDone && !isCurrent ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-slate-300 hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>

      {/* Passo 1: Certificado A1 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-indigo-600" />
              Certificado digital A1
            </CardTitle>
            <CardDescription>
              Envie o arquivo do seu certificado digital (.pfx) e a senha. O
              Vestra envia para o sistema fiscal de forma segura — não guardamos
              o arquivo nem a senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCertificateSubmit} className="space-y-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  Dados fiscais
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Inscrição Estadual (IE)</Label>
                    <Input
                      placeholder="IE"
                      value={fiscalData.ie}
                      onChange={(e) =>
                        setFiscalData((d) => ({ ...d, ie: e.target.value }))
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Inscrição Municipal (IM)</Label>
                    <Input
                      placeholder="IM"
                      value={fiscalData.im}
                      onChange={(e) =>
                        setFiscalData((d) => ({ ...d, im: e.target.value }))
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Regime tributário</Label>
                    <select
                      value={fiscalData.regimeTributario}
                      onChange={(e) =>
                        setFiscalData((d) => ({
                          ...d,
                          regimeTributario: e.target.value,
                        }))
                      }
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm"
                    >
                      <option value="1">1 – Simples Nacional</option>
                      <option value="2">2 – Simples (excesso sublimite)</option>
                      <option value="3">3 – Regime Normal</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">CEP</Label>
                    <Input
                      placeholder="00000-000"
                      value={fiscalData.cep}
                      onChange={(e) =>
                        setFiscalData((d) => ({ ...d, cep: e.target.value }))
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Logradouro</Label>
                    <Input
                      placeholder="Rua, Av."
                      value={fiscalData.logradouro}
                      onChange={(e) =>
                        setFiscalData((d) => ({
                          ...d,
                          logradouro: e.target.value,
                        }))
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Número</Label>
                    <Input
                      placeholder="Nº"
                      value={fiscalData.numero}
                      onChange={(e) =>
                        setFiscalData((d) => ({ ...d, numero: e.target.value }))
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Complemento</Label>
                    <Input
                      placeholder="Sala, loja"
                      value={fiscalData.complemento}
                      onChange={(e) =>
                        setFiscalData((d) => ({
                          ...d,
                          complemento: e.target.value,
                        }))
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Bairro</Label>
                    <Input
                      placeholder="Bairro"
                      value={fiscalData.bairro}
                      onChange={(e) =>
                        setFiscalData((d) => ({ ...d, bairro: e.target.value }))
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Município</Label>
                    <Input
                      placeholder="Cidade"
                      value={fiscalData.municipio}
                      onChange={(e) =>
                        setFiscalData((d) => ({
                          ...d,
                          municipio: e.target.value,
                        }))
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">UF</Label>
                    <Input
                      placeholder="SP"
                      maxLength={2}
                      value={fiscalData.uf}
                      onChange={(e) =>
                        setFiscalData((d) => ({
                          ...d,
                          uf: e.target.value.toUpperCase(),
                        }))
                      }
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Arquivo do certificado (.pfx ou .p12)</Label>
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <Input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={(e) =>
                      setCertificateFile(e.target.files?.[0] ?? null)
                    }
                    className="bg-slate-50"
                  />
                  {certificateFile && (
                    <span className="text-sm text-slate-600 self-center">
                      {certificateFile.name}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="cert-password">Senha do certificado</Label>
                <Input
                  id="cert-password"
                  type="password"
                  placeholder="Senha que você definiu ao exportar o certificado"
                  value={certificatePassword}
                  onChange={(e) => setCertificatePassword(e.target.value)}
                  className="mt-1 bg-slate-50"
                  autoComplete="off"
                />
              </div>
              {(settings?.certificateStatus === "valid" ||
                settings?.certificateId) && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  Certificado já cadastrado. Você pode enviar outro para
                  substituir.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={uploadingCert}
                  className="gap-2"
                >
                  {uploadingCert ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Enviar certificado
                </Button>
                {(settings?.certificateStatus === "valid" ||
                  settings?.certificateId ||
                  settings?.cscId) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                  >
                    Já tenho, pular
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Passo 2: CSC */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Código de Segurança do Contribuinte (CSC)
            </CardTitle>
            <CardDescription>
              O CSC é obrigatório para emissão de NFC-e. Você obtém na SEFAZ do
              seu estado. Se não souber onde pegar, use um dos links abaixo:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Onde pegar meu CSC?
              </p>
              <div className="flex flex-wrap gap-2">
                {SEFAZ_CSC_LINKS.map(({ uf, label, url }) => (
                  <a
                    key={uf}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 shadow-sm border border-slate-200 hover:bg-indigo-50"
                  >
                    {label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>

            <form onSubmit={handleCscSubmit} className="space-y-4">
              <div>
                <Label htmlFor="csc-id">ID do CSC</Label>
                <Input
                  id="csc-id"
                  type="text"
                  placeholder="Ex.: 1"
                  value={cscId}
                  onChange={(e) => setCscId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="csc-code">Código do CSC</Label>
                <Input
                  id="csc-code"
                  type="password"
                  placeholder="Código alfanumérico que a SEFAZ forneceu"
                  value={cscToken}
                  onChange={(e) => setCscToken(e.target.value)}
                  className="mt-1"
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar e continuar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Passo 3: Dados da empresa e ativar */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              Dados da empresa
            </CardTitle>
            <CardDescription>
              Confira os dados abaixo. Eles aparecem na nota fiscal. Para
              alterar nome ou CNPJ, use as configurações gerais da empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {org && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase">
                    Razão social
                  </span>
                  <p className="text-slate-900 font-medium">{org.name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase">
                    CNPJ
                  </span>
                  <p className="text-slate-900 font-mono text-sm">
                    {org.document || "—"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <Label
                  htmlFor="invoice-active"
                  className="text-base font-medium text-slate-900"
                >
                  Ativar emissão de NFC-e
                </Label>
                <p className="text-sm text-slate-500 mt-0.5">
                  Quando ativo, o Vestra emite nota fiscal ao finalizar vendas
                  no PDV.
                </p>
              </div>
              <Switch
                id="invoice-active"
                checked={isActive}
                onCheckedChange={handleToggleActive}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              {!isActive && (
                <Button
                  onClick={handleFinish}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Confirmar e ativar emissão
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
