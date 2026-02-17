"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createAsaasCustomer } from "@/actions/billing";
import { Loader2, UserPlus } from "lucide-react";

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
      window.location.reload(); // revalida dados
    } catch {
      setError("Erro ao cadastrar. Tente novamente.");
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3">
          {error}
        </div>
      )}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left font-semibold text-foreground p-3">Empresa</th>
              <th className="text-left font-semibold text-foreground p-3 hidden sm:table-cell">Documento</th>
              <th className="text-left font-semibold text-foreground p-3 hidden md:table-cell">Contato</th>
              <th className="text-left font-semibold text-foreground p-3">Asaas</th>
              <th className="text-right font-semibold text-foreground p-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-border hover:bg-muted/50">
                <td className="p-3">
                  <span className="font-medium text-foreground">{org.name}</span>
                  <span className="text-muted-foreground ml-1">({org.slug})</span>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{org.document || "—"}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{org.ownerEmail || "—"}</td>
                <td className="p-3">
                  {org.asaasCustomerId ? (
                    <span className="text-emerald-600 font-medium">Cadastrado</span>
                  ) : (
                    <span className="text-muted-foreground">Não cadastrado</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  {!org.asaasCustomerId && (
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
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
