"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { findClientByDocument } from "@/actions/clients";
import {
  completeSale,
  getSaleForReceipt,
  type PaymentMethod,
  type SaleReceiptData,
} from "@/actions/sales";
import {
  PosClientRegisterModal,
  type PosClient,
} from "./pos-client-register-modal";
import { normalizeCpf, normalizeCnpj } from "@/utils/mask";
import { Loader2, UserPlus, UserCheck, Printer, X } from "lucide-react";
import { Receipt } from "./recipt";

export type CartItem = {
  cartId: string;
  productId: string;
  variantId?: string;
  name: string;
  image: string | null;
  details: string;
  price: number;
  quantity: number;
  maxStock: number;
};

const PAYMENT_OPTIONS: { value: PaymentMethod | "ecommerce"; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "ecommerce", label: "Ecommerce" },
];

const ECOMMERCE_PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
];

interface PosCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  cart: CartItem[];
  subtotal: number;
  onSuccess: () => void;
}

export function PosCheckoutModal({
  open,
  onOpenChange,
  storeId,
  cart,
  subtotal,
  onSuccess,
}: Readonly<PosCheckoutModalProps>) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "ecommerce">("pix");
  const [ecommercePaymentMethod, setEcommercePaymentMethod] = useState<PaymentMethod>("pix");
  const [saleType, setSaleType] = useState<"wholesale" | "retail">("wholesale");
  const [retailSurcharge, setRetailSurcharge] = useState("");
  const [documentValue, setDocumentValue] = useState("");
  const [client, setClient] = useState<PosClient | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [hasInterest, setHasInterest] = useState(false);
  const [interestPercent, setInterestPercent] = useState("");
  const [receiptData, setReceiptData] = useState<SaleReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const normalizedInterest = interestPercent.trim().replaceAll(",", ".");
  const parsedInterestPercent = Number(normalizedInterest);
  const effectiveInterestPercent =
    paymentMethod === "credit" &&
    hasInterest &&
    Number.isFinite(parsedInterestPercent)
      ? Math.min(Math.max(parsedInterestPercent, 0), 100)
      : 0;
  // bps = percent * 100 (ex.: 3,5% => 350)
  const interestRateBps = Math.round(effectiveInterestPercent * 100);
  const interestCents =
    paymentMethod === "credit" && hasInterest
      ? Math.round((subtotal * interestRateBps) / 10_000)
      : 0;
  const normalizedSurcharge = retailSurcharge.trim().replaceAll(",", ".");
  const parsedSurcharge = Number(normalizedSurcharge);
  const surchargeCents =
    saleType === "retail" && Number.isFinite(parsedSurcharge)
      ? Math.round(parsedSurcharge * 100)
      : 0;

  const totalWithInterestCents = subtotal + interestCents + surchargeCents;

  const docDigits = documentValue.replaceAll(/\D/g, "");
  const isDocValid = docDigits.length === 11 || docDigits.length === 14;

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const digits = v.replaceAll(/\D/g, "");
    setDocumentValue(digits.length <= 11 ? normalizeCpf(v) : normalizeCnpj(v));
    setClient(null);
  };

  const handleSearchClient = async () => {
    if (!documentValue.trim()) {
      toast.error("Informe o CPF ou CNPJ.");
      return;
    }
    setSearching(true);
    try {
      const found = await findClientByDocument(documentValue);
      if (found) {
        setClient({
          id: found.id,
          name: found.name,
          document: found.document,
          type: found.type,
          email: found.email,
          phone: found.phone,
        });
        toast.success("Cliente encontrado.");
      } else {
        setClient(null);
        toast.info("Cliente não encontrado. Cadastre para vincular à venda.");
      }
    } catch {
      toast.error("Erro ao buscar cliente.");
    } finally {
      setSearching(false);
    }
  };

  const handleClientRegistered = (newClient: PosClient) => {
    setClient(newClient);
    setDocumentValue(
      newClient.document.length <= 14
        ? normalizeCpf(newClient.document)
        : normalizeCnpj(newClient.document),
    );
    setShowClientModal(false);
    toast.success("Cliente cadastrado e vinculado à venda.");
  };

  const handleConfirmSale = async () => {
    setSubmitting(true);
    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        unitPriceCents: item.price,
      }));
      const result = await completeSale(
        storeId,
        paymentMethod === "ecommerce" ? ecommercePaymentMethod : paymentMethod,
        items,
        client?.id ?? null,
        interestRateBps,
        surchargeCents,
        paymentMethod === "ecommerce",
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Venda concluída!");
      onSuccess();
      setClient(null);
      setDocumentValue("");

      if (result.saleId) {
        setLoadingReceipt(true);
        const receiptResult = await getSaleForReceipt(result.saleId);
        setLoadingReceipt(false);
        if ("data" in receiptResult) {
          setReceiptData({
            ...receiptResult.data,
            invoiceUrl: result.invoiceUrl ?? receiptResult.data.invoiceUrl,
          });
        }
      } else {
        onOpenChange(false);
      }
    } catch {
      toast.error("Erro ao processar venda.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseReceipt = () => {
    setReceiptData(null);
    onOpenChange(false);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => !receiptData && onOpenChange(isOpen)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {receiptData ? (
            <>
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>Comprovante de venda</DialogTitle>
              </DialogHeader>
              <div
                ref={receiptRef}
                className="receipt-print-area px-4 pb-4 overflow-auto"
              >
                <Receipt
                  organization={receiptData.organization}
                  store={receiptData.store}
                  items={receiptData.items}
                  total={receiptData.total}
                  date={receiptData.date}
                  orderId={receiptData.orderId}
                  invoiceUrl={receiptData.invoiceUrl}
                />
              </div>
              <div className="p-4 border-t bg-slate-50 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handlePrintReceipt}
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  type="button"
                  className="flex-1 gap-2"
                  onClick={handleCloseReceipt}
                >
                  <X className="h-4 w-4" />
                  Fechar
                </Button>
              </div>
            </>
          ) : loadingReceipt ? (
            <div className="p-8 flex flex-col items-center justify-center gap-3 ">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando comprovante...</p>
            </div>
          ) : (
            <>
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>Finalizar compra</DialogTitle>
              </DialogHeader>

              <ScrollArea className="flex-1 min-h-0 px-4 overflow-y-auto">
                <div className="space-y-4 pb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Resumo da venda
                    </h4>
                    <ul className="space-y-1.5 text-sm">
                      {cart.map((item) => (
                        <li
                          key={item.cartId}
                          className="flex justify-between gap-2 text-muted-foreground"
                        >
                          <span className="truncate">
                            {item.quantity}x {item.name}
                            {item.details !== "Padrão" && ` (${item.details})`}
                          </span>
                          <span className="shrink-0">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format((item.price * item.quantity) / 100)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Separator className="my-3" />
                    <div className="flex justify-between font-bold text-foreground">
                      <span>Total</span>
                      <span>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(totalWithInterestCents / 100)}
                      </span>
                    </div>
                    {paymentMethod === "credit" &&
                      hasInterest &&
                      interestRateBps > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(subtotal / 100)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>
                              Juros ({effectiveInterestPercent.toFixed(2)}%)
                            </span>
                            <span>
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(interestCents / 100)}
                            </span>
                          </div>
                        </div>
                      )}
                    {saleType === "retail" && surchargeCents > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(subtotal / 100)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Acréscimo Varejo</span>
                          <span>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(surchargeCents / 100)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Tipo de Venda
                    </h4>
                    <div
                      className="grid grid-cols-2 gap-2 mb-4"
                      role="radiogroup"
                      aria-label="Tipo de Venda"
                    >
                      <label
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                          saleType === "wholesale"
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name="saleType"
                          value="wholesale"
                          checked={saleType === "wholesale"}
                          onChange={() => setSaleType("wholesale")}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">Atacado</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                          saleType === "retail"
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name="saleType"
                          value="retail"
                          checked={saleType === "retail"}
                          onChange={() => setSaleType("retail")}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">Varejo</span>
                      </label>
                    </div>

                    {saleType === "retail" && (
                      <div className="rounded-lg border border-border bg-card p-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor="pos-retail-surcharge"
                            className="text-foreground shrink-0"
                          >
                            Acréscimo Total (R$)
                          </Label>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              R$
                            </span>
                            <Input
                              id="pos-retail-surcharge"
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={retailSurcharge}
                              onChange={(e) => setRetailSurcharge(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Forma de pagamento
                    </h4>
                    <div
                      className="grid grid-cols-2 gap-2"
                      role="radiogroup"
                      aria-label="Forma de pagamento"
                    >
                      {PAYMENT_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                            paymentMethod === opt.value
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border hover:bg-muted/60"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value={opt.value}
                            checked={paymentMethod === opt.value}
                            onChange={() => {
                              setPaymentMethod(opt.value);
                              if (opt.value !== "credit") {
                                setHasInterest(false);
                                setInterestPercent("");
                              }
                            }}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>

                    {paymentMethod === "ecommerce" && (
                      <div className="mt-4 p-4 border rounded-lg bg-card">
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Forma de pagamento (Ecommerce)
                        </h4>
                        <div
                          className="grid grid-cols-2 gap-2"
                          role="radiogroup"
                          aria-label="Forma de pagamento Ecommerce"
                        >
                          {ECOMMERCE_PAYMENT_OPTIONS.map((opt) => (
                            <label
                              key={opt.value}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                                ecommercePaymentMethod === opt.value
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border hover:bg-muted/60"
                              }`}
                            >
                              <input
                                type="radio"
                                name="ecommercePayment"
                                value={opt.value}
                                checked={ecommercePaymentMethod === opt.value}
                                onChange={() =>
                                  setEcommercePaymentMethod(opt.value as PaymentMethod)
                                }
                                className="sr-only"
                              />
                              <span className="text-sm font-medium">
                                {opt.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {paymentMethod === "credit" && (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="pos-interest-switch">
                          Tem juros no parcelado?
                        </Label>
                        <Switch
                          id="pos-interest-switch"
                          checked={hasInterest}
                          onCheckedChange={(checked) => {
                            setHasInterest(checked);
                            if (!checked) setInterestPercent("");
                          }}
                        />
                      </div>
                      {hasInterest && (
                        <div className="mt-3 flex items-center gap-2">
                          <Label
                            htmlFor="pos-interest-percent"
                            className="text-foreground"
                          >
                            Juros (%)
                          </Label>
                          <Input
                            id="pos-interest-percent"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="Ex.: 3.5"
                            value={interestPercent}
                            onChange={(e) => setInterestPercent(e.target.value)}
                            className="w-32"
                          />
                          <span className="text-xs text-muted-foreground">
                            (0% a 100%)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Cliente (CPF/CNPJ) — obrigatório
                    </h4>
                    <div className="flex gap-2">
                      <Input
                        placeholder="000.000.000-00 ou CNPJ"
                        value={documentValue}
                        onChange={handleDocumentChange}
                        className="flex-1"
                        maxLength={18}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSearchClient}
                        disabled={searching || !documentValue.trim()}
                      >
                        {searching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Buscar"
                        )}
                      </Button>
                    </div>
                    {client ? (
                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-foreground">
                        <UserCheck className="h-4 w-4 shrink-0" />
                        <span className="font-medium">{client.name}</span>
                      </div>
                    ) : (
                      isDocValid &&
                      documentValue.trim() && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-1"
                          onClick={() => setShowClientModal(true)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Cadastrar cliente
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-muted/40 space-y-2 shrink-0">
                {!client && (
                  <p className="text-xs text-muted-foreground text-center">
                    Busque ou cadastre um cliente para habilitar a venda.
                  </p>
                )}
                <Button
                  className="w-full bg-primary hover:bg-primary/90 font-bold py-6 px-4 text-primary-foreground"
                  size="lg"
                  onClick={handleConfirmSale}
                  disabled={submitting || cart.length === 0 || !client}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Confirmar venda"
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {receiptData &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-print="true"
            className="receipt-print-area"
            style={{
              position: "fixed",
              left: "-9999px",
              top: 0,
              width: "80mm",
              visibility: "hidden",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <Receipt
              organization={receiptData.organization}
              store={receiptData.store}
              items={receiptData.items}
              total={receiptData.total}
              date={receiptData.date}
              orderId={receiptData.orderId}
              invoiceUrl={receiptData.invoiceUrl}
            />
          </div>,
          document.body
        )}

      <PosClientRegisterModal
        open={showClientModal}
        onOpenChange={setShowClientModal}
        defaultDocument={documentValue}
        onSuccess={handleClientRegistered}
      />
    </>
  );
}
