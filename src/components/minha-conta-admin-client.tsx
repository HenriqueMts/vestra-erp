"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createAsaasCustomer, createOrUpdateSubscription } from "@/actions/billing";
import { Loader2, UserPlus, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrgRow = {
  id: string;
  name: string;
  document: string;
  slug: string;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  planValueCents: number | null;
  planBillingDay: number | null;
  ownerEmail: string | null;
};

export function MinhaContaAdminClient({ organizations }: { organizations: OrgRow[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planModalOrg, setPlanModalOrg] = useState<OrgRow | null>(null);
  const [planValue, setPlanValue] = useState("");
  const [planDay, setPlanDay] = useState("10");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  async function handleCadastrar(organizationId: string) {
    setError(null);
    setLoadingId(organizationId);
    try {
      const result = await createAsaasCustomer(organizationId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setLoadingId(null);
      window.location.reload();
    } catch {
      setError("Erro ao cadastrar. Tente novamente.");
      setLoadingId(null);
    }
  }

  function openPlanModal(org: OrgRow) {
    setPlanModalOrg(org);
    setPlanError(null);
    setPlanValue(org.planValueCents != null ? (org.planValueCents / 100).toFixed(2) : "");
    setPlanDay(org.planBillingDay != null ? String(org.planBillingDay) : "10");
  }

  async function handleDefinirPlano() {
    if (!planModalOrg) return;
    const value = parseFloat(planValue.replace(",", "."));
    const day = parseInt(planDay, 10);
    if (Number.isNaN(value) || value <= 0) {
      setPlanError("Informe um valor válido em reais.");
      return;
    }
    if (Number.isNaN(day) || day < 1 || day > 28) {
      setPlanError("Dia do vencimento deve ser entre 1 e 28.");
      return;
    }
    setPlanLoading(true);
    setPlanError(null);
    try {
      const result = await createOrUpdateSubscription(planModalOrg.id, value, day);
      if (result?.error) {
        setPlanError(result.error);
        setPlanLoading(false);
        return;
      }
      setPlanLoading(false);
      setPlanModalOrg(null);
      window.location.reload();
    } catch {
      setPlanError("Erro ao salvar. Tente novamente.");
      setPlanLoading(false);
    }
  }

  function formatPlan(org: OrgRow) {
    if (org.planValueCents == null) return "—";
    const reais = (org.planValueCents / 100).toFixed(2);
    const day = org.planBillingDay ?? "?";
    return `R$ ${reais}/mês (dia ${day})`;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3">
          {error}
        </div>
      )}
      <div className="border border-border rounded-xl overflow-x-auto bg-card">
        <table className="w-full min-w-[640px] sm:min-w-0 text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left font-semibold text-foreground p-3 min-w-[140px]">Empresa</th>
              <th className="text-left font-semibold text-foreground p-3 hidden sm:table-cell">Documento</th>
              <th className="text-left font-semibold text-foreground p-3 hidden md:table-cell">Contato</th>
              <th className="text-left font-semibold text-foreground p-3 min-w-[120px]">Asaas</th>
              <th className="text-left font-semibold text-foreground p-3 min-w-[140px] whitespace-nowrap">Cobrança</th>
              <th className="text-right font-semibold text-foreground p-3 min-w-[140px]">Ação</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-border hover:bg-muted/50">
                <td className="p-3 min-w-[140px]">
                  <span className="font-medium text-foreground">{org.name}</span>
                  <span className="text-muted-foreground ml-1">({org.slug})</span>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{org.document || "—"}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{org.ownerEmail || "—"}</td>
                <td className="p-3 min-w-[120px]">
                  {org.asaasCustomerId ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-primary font-medium">Cadastrado</span>
                      <span className="text-xs text-muted-foreground font-mono break-all">{org.asaasCustomerId}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Não cadastrado</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground min-w-[140px] whitespace-nowrap">
                  {org.asaasCustomerId ? formatPlan(org) : "—"}
                </td>
                <td className="p-3 text-right min-w-[140px]">
                  {!org.asaasCustomerId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={!!loadingId}
                      onClick={() => handleCadastrar(org.id)}
                    >
                      {loadingId === org.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <UserPlus size={14} />
                      )}
                      Cadastrar no Asaas
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => openPlanModal(org)}
                    >
                      <CreditCard size={14} />
                      {org.asaasSubscriptionId ? "Alterar cobrança" : "Definir cobrança"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!planModalOrg} onOpenChange={(open) => !open && setPlanModalOrg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {planModalOrg?.asaasSubscriptionId ? "Alterar valor da cobrança" : "Definir cobrança mensal"}
            </DialogTitle>
            <DialogDescription>
              {planModalOrg?.name}. Valor em reais e dia do vencimento (1–28). O Asaas gerará boletos mensais.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {planError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm p-2">
                {planError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="plan-value">Valor mensal (R$)</Label>
              <Input
                id="plan-value"
                type="text"
                inputMode="decimal"
                placeholder="Ex: 199,90"
                value={planValue}
                onChange={(e) => setPlanValue(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-day">Dia do vencimento (1 a 28)</Label>
              <Input
                id="plan-day"
                type="number"
                min={1}
                max={28}
                value={planDay}
                onChange={(e) => setPlanDay(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanModalOrg(null)}>
              Cancelar
            </Button>
            <Button disabled={planLoading} onClick={handleDefinirPlano}>
              {planLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
