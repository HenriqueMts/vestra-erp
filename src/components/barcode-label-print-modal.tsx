"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarcodeLabel } from "@/components/barcode-label";
import { Printer } from "lucide-react";
import type { ProductOptions } from "@/types/product";

interface BarcodeLabelPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productSku: string | null;
  basePriceCents: number;
  variants: Array<{
    id: string;
    sku?: string;
    colorId: string | null;
    sizeId: string | null;
  }>;
  options: ProductOptions;
}

export function BarcodeLabelPrintModal({
  open,
  onOpenChange,
  productName,
  productSku,
  basePriceCents,
  variants,
  options,
}: Readonly<BarcodeLabelPrintModalProps>) {
  const printRef = useRef<HTMLDivElement>(null);

  const priceReais = basePriceCents / 100;

  const labels =
    variants.length > 0
      ? variants.map((v) => {
          const colorName = v.colorId
            ? options.colors.find((c) => c.id === v.colorId)?.name
            : null;
          const sizeName = v.sizeId
            ? options.sizes.find((s) => s.id === v.sizeId)?.name
            : null;
          const variantName = [colorName, sizeName].filter(Boolean).join(" / ");
          return {
            sku: v.sku ?? productSku ?? "",
            name: productName,
            price: priceReais,
            variantName: variantName || undefined,
          };
        })
      : [
          {
            sku: productSku ?? "",
            name: productName,
            price: priceReais,
            variantName: undefined as string | undefined,
          },
        ];

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current;
    content.setAttribute("data-print-barcode", "true");
    window.print();
    content.removeAttribute("data-print-barcode");
  };

  const hasValidSku = productSku?.trim() || variants.some((v) => v.sku?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Imprimir etiquetas com código de barras</DialogTitle>
        </DialogHeader>
        {!hasValidSku ? (
          <p className="text-sm text-amber-600 py-4">
            Este produto não possui SKU cadastrado. Edite o produto e informe o
            código (SKU) para gerar etiquetas com código de barras.
          </p>
        ) : (
          <>
            <div
              ref={printRef}
              className="flex flex-wrap gap-4 p-4 border rounded-lg bg-slate-50 overflow-auto max-h-[50vh]"
            >
              {labels.map((label, i) => (
                <BarcodeLabel
                  key={i}
                  sku={label.sku}
                  name={label.name}
                  price={label.price}
                  variantName={label.variantName}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button type="button" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir etiquetas
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
