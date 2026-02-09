"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LockKeyholeOpen,
  LockKeyhole,
  ArrowLeft,
  Receipt,
  User,
  Calendar,
  DollarSign,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { closeDailyCash, reopenCash } from "@/actions/sales";
import Link from "next/link";

interface Sale {
  id: string;
  totalCents: number;
  paymentMethod: "pix" | "credit" | "debit" | "cash";
  createdAt: Date | string | null;
  seller: {
    id: string;
    name: string;
    email: string;
  } | null;
  client: {
    id: string;
    name: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPriceCents: number;
    product: {
      id: string;
      name: string;
    } | null;
  }>;
}

interface CashClosureClientProps {
  initialData: {
    success: boolean;
    sales: Sale[];
    totalCents: number;
    salesCount: number;
    isClosed: boolean;
    closureId: string | null;
  };
  storeId?: string | null;
}

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
};

const paymentMethodColors: Record<string, string> = {
  pix: "bg-blue-100 text-blue-700",
  credit: "bg-purple-100 text-purple-700",
  debit: "bg-green-100 text-green-700",
  cash: "bg-emerald-100 text-emerald-700",
};

export function CashClosureClient({
  initialData,
  storeId,
}: Readonly<CashClosureClientProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [isClosed, setIsClosed] = useState(initialData.isClosed);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);

  const formatDate = (date: Date | string | null) =>
    date
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(date))
      : "-";

  const handleCloseCash = () => {
    startTransition(async () => {
      const result = await closeDailyCash(storeId);

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      if ("success" in result && result.success) {
        toast.success(
          `Caixa fechado com sucesso! Vendas: ${result.salesCount}, Total: ${formatCurrency(result.totalCents)}`,
        );
        setIsClosed(true);
        router.refresh();
      }
    });
    setShowCloseDialog(false);
  };

  const handleReopenCash = () => {
    if (!initialData.closureId) return;

    startTransition(async () => {
      const result = await reopenCash(initialData.closureId!);

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      if ("success" in result && result.success) {
        toast.success("Caixa reaberto com sucesso!");
        setIsClosed(false);
        router.refresh();
      }
    });
    setShowReopenDialog(false);
  };

  return (
    <div className="w-full min-h-screen space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            Fechamento de Caixa
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Conferência de vendas do dia
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft size={16} />
              Voltar
            </Button>
          </Link>
          {isClosed ? (
            <Button
              variant="default"
              className="gap-2 bg-orange-600 hover:bg-orange-700"
              onClick={() => setShowReopenDialog(true)}
              disabled={isPending}
            >
              <LockKeyhole size={16} />
              {isPending ? "Reabrindo..." : "Reabrir Caixa"}
            </Button>
          ) : (
            <Button
              variant="default"
              className="gap-2"
              onClick={() => setShowCloseDialog(true)}
              disabled={isPending || initialData.salesCount === 0}
            >
              <LockKeyholeOpen size={16} />
              {isPending ? "Fechando..." : "Fechar Caixa"}
            </Button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <ShoppingBag className="h-5 w-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {initialData.salesCount}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Vendas realizadas hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total Arrecadado</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
              {formatCurrency(initialData.totalCents)}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Valor total do dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Calendar className="h-5 w-5 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {isClosed ? (
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                  Fechado
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Aberto
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Status do caixa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas do Dia</CardTitle>
          <CardDescription>
            Lista completa de todas as vendas realizadas hoje
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initialData.sales.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <Receipt className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-2 text-sm text-slate-500">
                Nenhuma venda registrada hoje.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID da Venda</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Forma de Pagamento</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">
                        {sale.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400" />
                          <span className="font-medium">
                            {sale.seller?.name || "Não informado"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.client?.name || (
                          <span className="text-slate-400">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            paymentMethodColors[sale.paymentMethod] ||
                            "bg-slate-100 text-slate-700"
                          }
                        >
                          {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {sale.items.slice(0, 2).map((item) => (
                            <span key={item.id} className="text-xs text-slate-600">
                              {item.quantity}x {item.product?.name || "Produto"}
                            </span>
                          ))}
                          {sale.items.length > 2 && (
                            <span className="text-xs text-slate-400">
                              +{sale.items.length - 2} mais
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(sale.totalCents)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(sale.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação - Fechar Caixa */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Fechamento de Caixa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja fechar o caixa do dia? Após o fechamento,
              não será possível realizar novas vendas até reabrir o caixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 space-y-2">
            <p className="font-medium">Resumo:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Total de vendas: {initialData.salesCount}</li>
              <li>Total arrecadado: {formatCurrency(initialData.totalCents)}</li>
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseCash}>
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Reabrir Caixa */}
      <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reabertura de Caixa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reabrir o caixa? Isso permitirá realizar
              novas vendas de última hora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReopenCash}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Confirmar Reabertura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
