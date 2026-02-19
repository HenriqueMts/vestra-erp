"use client";

import { useState } from "react";
import { createUserWithPassword, createOrganizationWithUserAndStores } from "@/actions/admin";
import { createAsaasCustomer, createOrUpdateSubscription } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Building2, Users, Mail, Calendar, CreditCard, CheckCircle2, XCircle, AlertCircle, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/** Próxima data de vencimento (YYYY-MM-DD) a partir do dia do mês (1-28). */
function getNextDueDateFromDay(day: number): string {
  const d = Math.max(1, Math.min(28, Math.floor(day)));
  const now = new Date();
  let next = new Date(now.getFullYear(), now.getMonth(), d);
  if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, d);
  return next.toISOString().slice(0, 10);
}

type Organization = {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  logoUrl: string | null;
  plan: string | null;
  billingStatus: "active" | "overdue" | "suspended" | null;
  createdAt: Date | null;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  planValueCents: number | null;
  planBillingDay: number | null;
  members: Array<{
    id: string;
    email: string;
    role: "owner" | "manager" | "seller";
    user: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  stores: Array<{
    id: string;
    name: string;
  }>;
};

interface AdminDashboardClientProps {
  organizations: Organization[];
}

export function AdminDashboardClient({
  organizations,
}: AdminDashboardClientProps) {
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedOrgForSubscription, setSelectedOrgForSubscription] = useState<Organization | null>(null);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isRegisteringAsaas, setIsRegisteringAsaas] = useState<string | null>(null);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [stores, setStores] = useState<Array<{ name: string; address: string }>>([
    { name: "", address: "" },
  ]);

  const addStore = () => {
    setStores([...stores, { name: "", address: "" }]);
  };

  const removeStore = (index: number) => {
    if (stores.length > 1) {
      setStores(stores.filter((_, i) => i !== index));
    }
  };

  const updateStore = (index: number, field: "name" | "address", value: string) => {
    const updated = [...stores];
    updated[index][field] = value;
    setStores(updated);
  };

  const handleCreateOrganization = async (formData: FormData) => {
    setIsCreatingOrg(true);
    
    // Dados do usuário
    const userName = formData.get("userName") as string;
    const userEmail = formData.get("userEmail") as string;
    const userPassword = formData.get("userPassword") as string;
    
    // Dados da organização
    const organizationName = formData.get("organizationName") as string;
    const organizationDocument = formData.get("organizationDocument") as string;
    const organizationLogoUrl = formData.get("organizationLogoUrl") as string;

    // Validar lojas (remover vazias)
    const validStores = stores.filter((s) => s.name.trim().length >= 2);
    
    if (validStores.length === 0) {
      setIsCreatingOrg(false);
      toast.error("Adicione pelo menos uma loja com nome válido.");
      return;
    }

    const result = await createOrganizationWithUserAndStores({
      userName,
      userEmail,
      userPassword,
      organizationName,
      organizationDocument: organizationDocument || undefined,
      organizationLogoUrl: organizationLogoUrl || undefined,
      stores: validStores.map((s) => ({
        name: s.name.trim(),
        address: s.address.trim() || undefined,
      })),
    });

    setIsCreatingOrg(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message || "Organização, usuário e lojas criados com sucesso!");
    setIsOrgDialogOpen(false);
    setStores([{ name: "", address: "" }]);
    // Reset form
    const form = document.getElementById("create-org-form") as HTMLFormElement;
    form?.reset();
  };

  const handleCreateUser = async (formData: FormData) => {
    if (!selectedOrgId) {
      toast.error("Selecione uma organização");
      return;
    }

    setIsCreatingUser(true);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = (formData.get("role") as "owner" | "manager" | "seller") || "owner";

    const result = await createUserWithPassword({
      name,
      email,
      password,
      organizationId: selectedOrgId,
      role,
    });

    setIsCreatingUser(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message || "Usuário criado com sucesso!");
    setIsUserDialogOpen(false);
    setSelectedOrgId("");
    // Reset form
    const form = document.getElementById("create-user-form") as HTMLFormElement;
    form?.reset();
  };

  const handleRegisterAsaas = async (organizationId: string) => {
    setIsRegisteringAsaas(organizationId);
    const result = await createAsaasCustomer(organizationId);
    setIsRegisteringAsaas(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Organização cadastrada no Asaas com sucesso!");
  };

  const handleCreateSubscription = async (formData: FormData) => {
    if (!selectedOrgForSubscription) {
      toast.error("Selecione uma organização");
      return;
    }

    setIsCreatingSubscription(true);
    const valueReais = parseFloat(formData.get("value") as string);
    const nextDueDate = formData.get("nextDueDate") as string | null;

    const result = await createOrUpdateSubscription(
      selectedOrgForSubscription.id,
      valueReais,
      nextDueDate && /^\d{4}-\d{2}-\d{2}$/.test(nextDueDate) ? nextDueDate : 5
    );

    setIsCreatingSubscription(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Assinatura criada/atualizada com sucesso!");
    setIsSubscriptionDialogOpen(false);
    setSelectedOrgForSubscription(null);
    const form = document.getElementById("create-subscription-form") as HTMLFormElement;
    form?.reset();
  };

  const getBillingStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm border-0 font-medium px-2.5 py-1">
            Ativo
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm border-0 font-medium px-2.5 py-1">
            Atrasado
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-white shadow-sm border-0 font-medium px-2.5 py-1">
            Suspenso
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-medium px-2.5 py-1">
            N/A
          </Badge>
        );
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
      manager: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
      seller: "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700",
    };
    const labels: Record<string, string> = {
      owner: "Proprietário",
      manager: "Gerente",
      seller: "Vendedor",
    };
    return (
      <Badge className={`${colors[role] || "bg-gray-500"} text-white shadow-sm border-0 font-medium text-xs px-2 py-0.5 transition-all`}>
        {labels[role] || role}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-4 border-b border-border/50 w-full">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-foreground">Organizações Cadastradas</h3>
          <p className="text-sm text-muted-foreground font-medium">
            Gerencie todas as organizações e seus usuários
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-200 font-semibold">
                <Plus size={18} className="mr-2" />
                Nova Organização
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-2">
              <DialogHeader className="space-y-2 pb-4 border-b">
                <DialogTitle className="text-2xl font-bold">Criar Nova Organização</DialogTitle>
                <DialogDescription className="text-base font-medium">
                  Cadastre o usuário, organização e lojas em uma única operação
                </DialogDescription>
              </DialogHeader>
              <form
                id="create-org-form"
                action={handleCreateOrganization}
                className="space-y-6 pt-4"
              >
                {/* Seção: Dados do Usuário */}
                <div className="space-y-4 pb-4 border-b">
                  <h3 className="text-lg font-semibold text-foreground">Dados do Usuário</h3>
                  <div className="space-y-2">
                    <Label htmlFor="userName">Nome Completo *</Label>
                    <Input
                      id="userName"
                      name="userName"
                      placeholder="Ex: João Silva"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userEmail">E-mail *</Label>
                    <Input
                      id="userEmail"
                      name="userEmail"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPassword">Senha *</Label>
                    <Input
                      id="userPassword"
                      name="userPassword"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Seção: Dados da Organização */}
                <div className="space-y-4 pb-4 border-b">
                  <h3 className="text-lg font-semibold text-foreground">Dados da Organização</h3>
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Nome da Organização *</Label>
                    <Input
                      id="organizationName"
                      name="organizationName"
                      placeholder="Ex: Loja ABC"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizationDocument">CPF/CNPJ</Label>
                    <Input
                      id="organizationDocument"
                      name="organizationDocument"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizationLogoUrl">URL do Logo</Label>
                    <Input
                      id="organizationLogoUrl"
                      name="organizationLogoUrl"
                      type="url"
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>
                </div>

                {/* Seção: Lojas */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Lojas</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addStore}
                      className="font-medium"
                    >
                      <Plus size={16} className="mr-1.5" />
                      Adicionar Loja
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {stores.map((store, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`store-name-${index}`}>
                            Nome da Loja {index + 1} *
                          </Label>
                          <Input
                            id={`store-name-${index}`}
                            placeholder="Ex: Loja Matriz"
                            value={store.name}
                            onChange={(e) => updateStore(index, "name", e.target.value)}
                            required
                          />
                          <Label htmlFor={`store-address-${index}`}>
                            Endereço
                          </Label>
                          <Input
                            id={`store-address-${index}`}
                            placeholder="Ex: Rua João Teodoro, 1200"
                            value={store.address}
                            onChange={(e) => updateStore(index, "address", e.target.value)}
                          />
                        </div>
                        {stores.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStore(index)}
                            className="mt-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={18} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsOrgDialogOpen(false);
                      setStores([{ name: "", address: "" }]);
                    }}
                    className="font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isCreatingOrg}
                    className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all font-semibold"
                  >
                    {isCreatingOrg ? "Criando..." : "Criar Organização"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-2 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200 font-semibold shadow-sm hover:shadow-md">
                <Users size={18} className="mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md shadow-2xl border-2">
              <DialogHeader className="space-y-2 pb-4 border-b">
                <DialogTitle className="text-2xl font-bold">Criar Novo Usuário</DialogTitle>
                <DialogDescription className="text-base font-medium">
                  Crie um novo usuário e associe a uma organização
                </DialogDescription>
              </DialogHeader>
              <form
                id="create-user-form"
                action={handleCreateUser}
                className="space-y-5 pt-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="org-select">Organização *</Label>
                  <Select
                    value={selectedOrgId}
                    onValueChange={setSelectedOrgId}
                    required
                  >
                    <SelectTrigger id="org-select">
                      <SelectValue placeholder="Selecione uma organização" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-name">Nome Completo *</Label>
                  <Input
                    id="user-name"
                    name="name"
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-email">E-mail *</Label>
                  <Input
                    id="user-email"
                    name="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-password">Senha *</Label>
                  <Input
                    id="user-password"
                    name="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-role">Função *</Label>
                  <Select name="role" defaultValue="owner" required>
                    <SelectTrigger id="user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Proprietário</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="seller">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsUserDialogOpen(false);
                      setSelectedOrgId("");
                    }}
                    className="font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isCreatingUser || !selectedOrgId}
                    className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all font-semibold"
                  >
                    {isCreatingUser ? "Criando..." : "Criar Usuário"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {organizations.length === 0 ? (
        <Card className="border-2 border-dashed bg-muted/30">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium text-base">
              Nenhuma organização cadastrada ainda.
            </p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              Clique em "Nova Organização" para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border-2 shadow-sm bg-card overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <Table className="w-full table-auto">
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-muted/50 border-b-2">
                  <TableHead className="font-bold text-foreground py-4">Organização</TableHead>
                  <TableHead className="font-bold text-foreground py-4">Documento</TableHead>
                  <TableHead className="font-bold text-foreground py-4">Status</TableHead>
                  <TableHead className="font-bold text-foreground py-4">Asaas</TableHead>
                  <TableHead className="font-bold text-foreground py-4">Usuários</TableHead>
                  <TableHead className="font-bold text-foreground py-4">Lojas</TableHead>
                  <TableHead className="font-bold text-foreground py-4">Criado em</TableHead>
                  <TableHead className="font-bold text-foreground py-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org, index) => (
                  <TableRow 
                    key={org.id}
                    className="hover:bg-muted/30 transition-colors duration-150 border-b border-border/50 group"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="w-10 h-10 rounded-lg object-cover border-2 border-border shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center border-2 border-primary/10 shadow-sm group-hover:shadow-md transition-shadow">
                            <Building2 size={18} className="text-primary" />
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {org.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {org.slug}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {org.document ? (
                        <span className="text-sm font-medium text-foreground">{org.document}</span>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {getBillingStatusBadge(org.billingStatus)}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1.5">
                        {org.asaasCustomerId ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              Cliente cadastrado
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <XCircle size={14} className="text-muted-foreground/60" />
                            <span className="text-xs text-muted-foreground/70">
                              Não cadastrado
                            </span>
                          </div>
                        )}
                        {org.asaasSubscriptionId ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-blue-500" />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                              Assinatura ativa
                            </span>
                            {org.planValueCents && (
                              <span className="text-xs text-muted-foreground">
                                R$ {(org.planValueCents / 100).toFixed(2).replace(".", ",")}/mês
                              </span>
                            )}
                          </div>
                        ) : org.asaasCustomerId ? (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-amber-500" />
                            <span className="text-xs text-amber-700 dark:text-amber-400">
                              Sem assinatura
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-2 min-w-[200px]">
                        {org.members.length === 0 ? (
                          <span className="text-muted-foreground/70 text-sm italic">
                            Nenhum usuário
                          </span>
                        ) : (
                          org.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 text-sm group/item"
                            >
                              <Mail size={14} className="text-muted-foreground/60 group-hover/item:text-primary transition-colors" />
                              <span className="truncate max-w-[180px] font-medium text-foreground">
                                {member.user?.name || member.email}
                              </span>
                              {getRoleBadge(member.role)}
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1.5 min-w-[150px]">
                        {org.stores.length === 0 ? (
                          <span className="text-muted-foreground/70 text-sm italic">Nenhuma</span>
                        ) : (
                          org.stores.map((store) => (
                            <div 
                              key={store.id} 
                              className="flex items-center gap-2 text-sm group/item"
                            >
                              <Building2 size={14} className="text-muted-foreground/60 group-hover/item:text-primary transition-colors" />
                              <span className="font-medium text-foreground">{store.name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {org.createdAt ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar size={14} className="text-muted-foreground/60" />
                          <span className="font-medium">
                            {new Date(org.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {!org.asaasCustomerId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegisterAsaas(org.id)}
                            disabled={isRegisteringAsaas === org.id}
                            className="text-xs font-semibold border-2 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:border-emerald-700 dark:hover:text-emerald-400 transition-all"
                          >
                            {isRegisteringAsaas === org.id ? (
                              <>Cadastrando...</>
                            ) : (
                              <>
                                <CreditCard size={14} className="mr-1.5" />
                                Cadastrar no Asaas
                              </>
                            )}
                          </Button>
                        ) : !org.asaasSubscriptionId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrgForSubscription(org);
                              setIsSubscriptionDialogOpen(true);
                            }}
                            className="text-xs font-semibold border-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:border-blue-700 dark:hover:text-blue-400 transition-all"
                          >
                            <CreditCard size={14} className="mr-1.5" />
                            Criar Assinatura
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrgForSubscription(org);
                              setIsSubscriptionDialogOpen(true);
                            }}
                            className="text-xs font-semibold border-2 hover:bg-primary/10 hover:border-primary/30 transition-all"
                          >
                            <CreditCard size={14} className="mr-1.5" />
                            Editar Assinatura
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Dialog para criar/editar assinatura */}
      <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
        <DialogContent className="max-w-md shadow-2xl border-2">
          <DialogHeader className="space-y-2 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedOrgForSubscription?.asaasSubscriptionId
                ? "Editar Assinatura"
                : "Criar Assinatura"}
            </DialogTitle>
            <DialogDescription className="text-base font-medium">
              {selectedOrgForSubscription?.asaasSubscriptionId
                ? "Atualize o valor e dia de vencimento da assinatura"
                : `Configure a assinatura mensal para ${selectedOrgForSubscription?.name || "a organização"}`}
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-subscription-form"
            key={selectedOrgForSubscription?.id}
            action={handleCreateSubscription}
            className="space-y-5 pt-4"
          >
            <div className="space-y-2">
              <Label htmlFor="subscription-value">Valor Mensal (R$) *</Label>
              <Input
                id="subscription-value"
                name="value"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                defaultValue={
                  selectedOrgForSubscription?.planValueCents
                    ? (selectedOrgForSubscription.planValueCents / 100).toFixed(2)
                    : ""
                }
                required
                className="text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                Valor que será cobrado mensalmente da organização
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription-due-date">
                <Calendar className="inline size-4 mr-1.5 -mt-0.5" />
                Vencimento *
              </Label>
              <DatePicker
                name="nextDueDate"
                placeholder="Escolher data de vencimento"
                defaultValue={
                  new Date(
                    selectedOrgForSubscription?.planBillingDay
                      ? getNextDueDateFromDay(selectedOrgForSubscription.planBillingDay)
                      : getNextDueDateFromDay(5)
                  )
                }
                minDate={new Date()}
                required
              />
              <p className="text-xs text-muted-foreground">
                Data do próximo vencimento (o dia do mês será usado nas cobranças mensais)
              </p>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSubscriptionDialogOpen(false);
                  setSelectedOrgForSubscription(null);
                }}
                className="font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingSubscription || !selectedOrgForSubscription}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all font-semibold"
              >
                {isCreatingSubscription
                  ? "Salvando..."
                  : selectedOrgForSubscription?.asaasSubscriptionId
                  ? "Atualizar Assinatura"
                  : "Criar Assinatura"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
