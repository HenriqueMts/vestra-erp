"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Store,
  Printer,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { closeDailyCash, reopenCash, getCashClosureReport } from "@/actions/sales";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

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

/** Dados do relatório de fechamento (para o modal de impressão) */
type ClosureReportData = {
  closure: {
    id: string;
    totalCents: number;
    salesCount: number;
    periodStart: Date | string;
    periodEnd: Date | string;
    createdAt: Date | string | null;
  };
  storeName: string;
  orgName: string;
  closedByName: string;
  sales: Array<{
    id: string;
    totalCents: number;
    paymentMethod: string;
    createdAt: Date | string | null;
    seller: { name: string } | null;
    client: { name: string } | null;
    items: Array<{ quantity: number; unitPriceCents: number; productName: string }>;
  }>;
};

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
  stores: Array<{ id: string; name: string }>;
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
  cash: "bg-chart-2/20 text-chart-2",
};

export function CashClosureClient({
  initialData,
  storeId,
  stores,
}: Readonly<CashClosureClientProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [isClosed, setIsClosed] = useState(initialData.isClosed);
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || stores[0]?.id || "");
  const [reportData, setReportData] = useState<ClosureReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Sincronizar estado quando loja mudar via query param
  useEffect(() => {
    if (storeId && storeId !== selectedStoreId) {
      setSelectedStoreId(storeId);
      setIsClosed(initialData.isClosed);
    }
  }, [storeId, initialData.isClosed, selectedStoreId]);

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? null;

  const handleStoreChange = (newStore: { id: string; name: string } | null) => {
    if (!newStore) return;
    setSelectedStoreId(newStore.id);
    router.push(`/dashboard/cash-closure?store=${newStore.id}`);
  };

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
      const result = await closeDailyCash(selectedStoreId);

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      if ("success" in result && result.success && "closureId" in result) {
        toast.success(
          `Caixa fechado com sucesso! Vendas: ${result.salesCount}, Total: ${formatCurrency(result.totalCents)}`,
        );
        setIsClosed(true);
        setShowCloseDialog(false);
        router.refresh();

        setLoadingReport(true);
        const reportResult = await getCashClosureReport(result.closureId);
        setLoadingReport(false);
        if ("data" in reportResult && reportResult.data) {
          setReportData(reportResult.data);
        }
      }
    });
    setShowCloseDialog(false);
  };

  const formatDateTime = (date: Date | string | null) =>
    date
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(date))
      : "—";

  const formatDateOnly = (date: Date | string | null) =>
    date
      ? new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date(date))
      : "—";

  const handlePrintReport = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  /** Conteúdo do relatório para visualização no modal (layout completo) */
  const renderReportContent = (report: ClosureReportData) => (
    <div className="space-y-4 text-sm text-black">
      <header className="border-b border-gray-400 pb-3">
        <h2 className="text-lg font-bold">Relatório de Fechamento de Caixa</h2>
        <p className="mt-1">{report.orgName} · {report.storeName}</p>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
          <p><strong>Período:</strong> {formatDateOnly(report.closure.periodStart)}</p>
          <p><strong>Fechado por:</strong> {report.closedByName}</p>
          <p><strong>Data do fechamento:</strong> {formatDateTime(report.closure.createdAt)}</p>
        </div>
      </header>
      <section>
        <h3 className="font-semibold">Resumo</h3>
        <ul className="mt-1 list-disc list-inside">
          <li>Total de vendas: {report.closure.salesCount}</li>
          <li>Total arrecadado: {formatCurrency(report.closure.totalCents)}</li>
        </ul>
      </section>
      <section>
        <h3 className="font-semibold">Vendas do dia</h3>
        <table className="mt-2 w-full border-collapse border border-gray-400 text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">ID</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Data/Hora</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Vendedor</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Cliente</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Pagamento</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-semibold">Itens</th>
              <th className="border border-gray-400 px-2 py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {report.sales.map((sale) => (
              <tr key={sale.id}>
                <td className="border border-gray-400 px-2 py-1 font-mono">{sale.id.slice(0, 8)}...</td>
                <td className="border border-gray-400 px-2 py-1">{formatDateTime(sale.createdAt)}</td>
                <td className="border border-gray-400 px-2 py-1">{sale.seller?.name ?? "—"}</td>
                <td className="border border-gray-400 px-2 py-1">{sale.client?.name ?? "—"}</td>
                <td className="border border-gray-400 px-2 py-1">{paymentMethodLabels[sale.paymentMethod] ?? sale.paymentMethod}</td>
                <td className="border border-gray-400 px-2 py-1">{sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}</td>
                <td className="border border-gray-400 px-2 py-1 text-right font-medium">{formatCurrency(sale.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <footer className="border-t border-gray-400 pt-3 text-xs">
        Documento gerado em {formatDateTime(new Date())} · Vestra ERP
      </footer>
    </div>
  );

  /** Versão 80mm para impressão (mesma largura do cupom) */
  const renderReportContent80mm = (report: ClosureReportData) => (
    <div className="w-[80mm] max-w-[80mm] bg-white p-2 text-[9px] font-mono leading-tight text-black">
      <div className="text-center border-b border-black pb-1.5 border-dashed">
        <h2 className="font-bold text-[10px] uppercase">Fechamento de Caixa</h2>
        <p className="text-[8px] mt-0.5">{report.orgName}</p>
        <p className="text-[8px]">{report.storeName}</p>
        <p className="text-[8px]">{formatDateOnly(report.closure.periodStart)}</p>
        <p className="text-[8px]">Fechado por: {report.closedByName}</p>
        <p className="text-[8px]">{formatDateTime(report.closure.createdAt)}</p>
      </div>
      <div className="border-b border-black pb-1.5 border-dashed mt-1.5">
        <p className="font-bold">Resumo</p>
        <p>Vendas: {report.closure.salesCount}</p>
        <p>Total: {formatCurrency(report.closure.totalCents)}</p>
      </div>
      <div className="border-b border-black pb-1.5 border-dashed mt-1.5">
        <p className="font-bold mb-1">Vendas do dia</p>
        <div className="flex font-bold mb-0.5 text-[8px]">
          <span className="w-10">R$</span>
          <span className="flex-1">Hora</span>
        </div>
        {report.sales.map((sale) => (
          <div key={sale.id} className="flex mb-0.5 text-[8px]">
            <span className="w-10">{formatCurrency(sale.totalCents)}</span>
            <span className="flex-1">{formatDateTime(sale.createdAt)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between font-bold mt-1.5 text-[10px]">
        <span>TOTAL</span>
        <span>{formatCurrency(report.closure.totalCents)}</span>
      </div>
      <div className="text-center mt-2 text-[8px] border-t border-black border-dashed pt-1.5">
        <p>Vestra ERP</p>
      </div>
    </div>
  );

  const handleCloseReport = () => {
    setReportData(null);
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
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Fechamento de Caixa
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Conferência de vendas do dia
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stores.length > 1 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="store-combobox" className="text-sm font-medium whitespace-nowrap">
                <Store className="inline size-4 mr-1.5 -mt-0.5" />
                Loja:
              </Label>
              <Combobox
                items={stores}
                value={selectedStore}
                onValueChange={(value) => handleStoreChange(value ?? null)}
                itemToStringLabel={(store) => store.name}
                itemToStringValue={(store) => store.id}
                isItemEqualToValue={(item, val) => (val && typeof val === "object" && "id" in val ? item.id === val.id : item.id === val)}
              >
                <ComboboxInput
                  id="store-combobox"
                  placeholder="Selecione a loja"
                  className="w-[220px]"
                />
                <ComboboxContent>
                  <ComboboxEmpty>Nenhuma loja encontrada.</ComboboxEmpty>
                  <ComboboxList>
                    {(store) => (
                      <ComboboxItem key={store.id} value={store}>
                        {store.name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          )}
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
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {initialData.salesCount}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Vendas realizadas hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total Arrecadado</CardTitle>
            <DollarSign className="h-5 w-5 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-chart-2">
              {formatCurrency(initialData.totalCents)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Valor total do dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" />
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
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
            <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
              <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
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
                          <User size={14} className="text-muted-foreground" />
                          <span className="font-medium">
                            {sale.seller?.name || "Não informado"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.client?.name || (
                          <span className="text-muted-foreground">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            paymentMethodColors[sale.paymentMethod] ||
                            "bg-muted text-foreground"
                          }
                        >
                          {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {sale.items.slice(0, 2).map((item) => (
                            <span key={item.id} className="text-xs text-muted-foreground">
                              {item.quantity}x {item.product?.name || "Produto"}
                            </span>
                          ))}
                          {sale.items.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{sale.items.length - 2} mais
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(sale.totalCents)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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

      {/* Dialog do Relatório de Fechamento (igual ao cupom: exibe na tela) */}
      <Dialog
        open={loadingReport || reportData !== null}
        onOpenChange={(open) => !open && !loadingReport && handleCloseReport()}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              {loadingReport ? "Gerando relatório..." : "Relatório de Fechamento de Caixa"}
            </DialogTitle>
          </DialogHeader>
          {loadingReport ? (
            <div className="p-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando relatório...</p>
            </div>
          ) : reportData ? (
            <>
              <div className="receipt-print-area px-4 pb-4 overflow-auto">
                {renderReportContent(reportData)}
              </div>
              <div className="p-4 border-t bg-muted/50 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handlePrintReport}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  type="button"
                  className="flex-1 gap-2"
                  onClick={handleCloseReport}
                >
                  <X className="h-4 w-4" />
                  Fechar
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Cópia do relatório em 80mm só para impressão (mesma largura do cupom) */}
      {reportData &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-print="closure-report"
            className="fixed left-0 top-0 z-[99999] bg-white text-black"
            style={{
              visibility: "hidden",
              pointerEvents: "none",
              height: "auto",
            }}
            aria-hidden
          >
            {renderReportContent80mm(reportData)}
          </div>,
          document.body
        )}
    </div>
  );
}
