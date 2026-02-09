"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type PaymentMethod,
} from "@/actions/sales";
import { PosClientRegisterModal, type PosClient } from "./pos-client-register-modal";
import { normalizeCpf, normalizeCnpj } from "@/utils/mask";
import { Loader2, UserPlus, UserCheck } from "lucide-react";

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
}: PosCheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [documentValue, setDocumentValue] = useState("");
  const [client, setClient] = useState<PosClient | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  const docDigits = documentValue.replace(/\D/g, "");
  const isDocValid = docDigits.length === 11 || docDigits.length === 14;

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const digits = v.replace(/\D/g, "");
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
        client?.id ?? null
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Venda concluída!");
      onSuccess();
      onOpenChange(false);
      setClient(null);
      setDocumentValue("");
    } catch {
      toast.error("Erro ao processar venda.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
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
                    }).format(subtotal / 100)}
                  </span>
                </div>
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
                        onChange={() => setPaymentMethod(opt.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

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
