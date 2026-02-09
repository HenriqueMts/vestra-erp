"use client";

import { useState, useRef } from "react";
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
import { PosClientRegisterModal, type PosClient } from "./pos-client-register-modal";
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

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
  { value: "cash", label: "Dinheiro" },
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
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
    paymentMethod === "credit" && hasInterest && Number.isFinite(parsedInterestPercent)
      ? Math.min(Math.max(parsedInterestPercent, 0), 100)
      : 0;
  // bps = percent * 100 (ex.: 3,5% => 350)
  const interestRateBps = Math.round(effectiveInterestPercent * 100);
  const interestCents =
    paymentMethod === "credit" && hasInterest
      ? Math.round((subtotal * interestRateBps) / 10_000)
      : 0;
  const totalWithInterestCents = subtotal + interestCents;

  const docDigits = documentValue.replaceAll(/\D/g, "");
  const isDocValid = docDigits.length === 11 || docDigits.length === 14;

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const digits = v.replaceAll(/\D/g, "");
    setDocumentValue(
      digits.length <= 11 ? normalizeCpf(v) : normalizeCnpj(v)
    );
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
        : normalizeCnpj(newClient.document)
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
        paymentMethod,
        items,
        client?.id ?? null,
        interestRateBps,
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
          setReceiptData(receiptResult.data);
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
      <Dialog open={open} onOpenChange={(isOpen) => !receiptData && onOpenChange(isOpen)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          {receiptData ? (
            <>
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>Comprovante de venda</DialogTitle>
              </DialogHeader>
              <div
                ref={receiptRef}
                className="receipt-print-area px-4 pb-4 overflow-auto"
                data-print="true"
              >
                <Receipt
                  organization={receiptData.organization}
                  store={receiptData.store}
                  items={receiptData.items}
                  total={receiptData.total}
                  date={receiptData.date}
                  orderId={receiptData.orderId}
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
            <div className="p-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm text-slate-600">Gerando comprovante...</p>
            </div>
          ) : (
            <>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Finalizar compra</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[60vh] px-4">
            <div className="space-y-4 pb-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  Resumo da venda
                </h4>
                <ul className="space-y-1.5 text-sm">
                  {cart.map((item) => (
                    <li
                      key={item.cartId}
                      className="flex justify-between gap-2 text-slate-600"
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
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Total</span>
                  <span>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(totalWithInterestCents / 100)}
                  </span>
                </div>
                {paymentMethod === "credit" && hasInterest && interestRateBps > 0 && (
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
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
                      <span>Juros ({effectiveInterestPercent.toFixed(2)}%)</span>
                      <span>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(interestCents / 100)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
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
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                          : "border-slate-200 hover:bg-slate-50"
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
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {paymentMethod === "credit" && (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
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
                      <Label htmlFor="pos-interest-percent" className="text-slate-700">
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
                      <span className="text-xs text-slate-500">
                        (0% a 100%)
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
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
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
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

          <div className="p-4 border-t bg-slate-50 space-y-2">
            {!client && (
              <p className="text-xs text-amber-600 text-center">
                Busque ou cadastre um cliente para habilitar a venda.
              </p>
            )}
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold"
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

      <PosClientRegisterModal
        open={showClientModal}
        onOpenChange={setShowClientModal}
        defaultDocument={documentValue}
        onSuccess={handleClientRegistered}
      />
    </>
  );
}
