"use client";

import { useState, useMemo } from "react";
import { MoreHorizontal, Pencil, Trash2, Barcode, Truck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { ProductForm } from "./product-form";
import { deleteProduct } from "@/actions/products";
import { BarcodeLabelPrintModal } from "./barcode-label-print-modal";
import { transferStock, addIncomingStock } from "@/actions/inventory";
import type { ProductOptions, ProductInitialData } from "@/types/product";

interface ProductRowActionsProps {
  id: string;
  name: string;
  basePrice: number;
  costPrice?: number | null;
  sku?: string | null;
  categoryId: string | null;
  description: string | null;
  imageUrl: string | null;
  status: "active" | "inactive" | "archived" | null;
  images?: Array<{ id: string; url: string; order: number | null }>;
  inventory?: Array<{ id: string; storeId: string; quantity: number }>;
  variants?: Array<{
    id: string;
    sku?: string | null;
    colorId: string | null;
    sizeId: string | null;
    inventory: Array<{ id: string; storeId: string; quantity: number }>;
  }>;
  ncm?: string | null;
  origin?: string | null;
  cfop?: string | null;
  cest?: string | null;
  organizationId: string;
  options: ProductOptions;
}

export function ProductRowActions({
  id,
  name,
  basePrice,
  costPrice = null,
  sku = null,
  categoryId,
  description,
  imageUrl,
  status,
  images = [],
  inventory = [],
  variants = [],
  ncm = null,
  origin = null,
  cfop = null,
  cest = null,
  organizationId,
  options,
}: Readonly<ProductRowActionsProps>) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);

  const [transferFromStoreId, setTransferFromStoreId] = useState("");
  const [transferToStoreId, setTransferToStoreId] = useState("");
  const [transferVariantId, setTransferVariantId] = useState<string | null>(null);
  const [transferQty, setTransferQty] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  const [addStockVariantId, setAddStockVariantId] = useState<string | null>(null);
  const [addStockQuantities, setAddStockQuantities] = useState<Record<string, string>>({});
  const [addStockLoading, setAddStockLoading] = useState(false);

  const hasVariants = variants.length > 0;

  const getVariantLabel = (v: (typeof variants)[0]) => {
    const colorName =
      options.colors.find((c) => c.id === v.colorId)?.name ?? "";
    const sizeName = options.sizes.find((s) => s.id === v.sizeId)?.name ?? "";
    return [sizeName, colorName].filter(Boolean).join(" - ") || v.sku || "Variante";
  };

  const maxTransferQty = useMemo(() => {
    if (!transferFromStoreId) return 0;
    if (hasVariants && transferVariantId) {
      const v = variants.find((x) => x.id === transferVariantId);
      const inv = v?.inventory.find((i) => i.storeId === transferFromStoreId);
      return inv?.quantity ?? 0;
    }
    const inv = inventory.find((i) => i.storeId === transferFromStoreId);
    return inv?.quantity ?? 0;
  }, [hasVariants, transferFromStoreId, transferVariantId, variants, inventory]);

  const handleDelete = async () => {
    const result = await deleteProduct(id, organizationId);
    if (result.success) {
      toast.success("Produto deletado!");
      setIsDeleteOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const initialData: ProductInitialData = {
    id,
    name,
    basePrice,
    costPrice: costPrice ?? null,
    categoryId: categoryId ?? "",
    description: description ?? "",
    imageUrl: imageUrl ?? null,
    status: status ?? "active",
    images,
    inventory,
    variants,
    sku: sku ?? undefined,
    ncm: ncm ?? undefined,
    origin: origin ?? undefined,
    cfop: cfop ?? undefined,
    cest: cest ?? undefined,
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 sm:w-56">
          <DropdownMenuLabel className="text-xs sm:text-sm">
            Ações
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => {
              setAddStockVariantId(null);
              setAddStockQuantities({});
              setIsAddStockOpen(true);
            }}
            className="cursor-pointer gap-2 text-foreground text-sm"
          >
            <Plus className="h-4 w-4" /> Adicionar Estoque
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsBarcodeOpen(true)}
            className="cursor-pointer gap-2 text-foreground text-sm"
          >
            <Barcode className="h-4 w-4" /> Imprimir etiqueta (cód. barras)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setTransferFromStoreId("");
              setTransferToStoreId("");
              setTransferVariantId(null);
              setTransferQty("");
              setIsTransferOpen(true);
            }}
            className="cursor-pointer gap-2 text-foreground text-sm"
          >
            <Truck className="h-4 w-4" /> Transferir para outra loja
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsEditOpen(true)}
            className="cursor-pointer gap-2 text-primary text-sm"
          >
            <Pencil className="h-4 w-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
            className="cursor-pointer gap-2 text-destructive text-sm"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[800px] lg:max-w-[900px] bg-card max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">
              Editar Produto
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Alterar dados de {name}.
            </DialogDescription>
          </DialogHeader>

          <ProductForm
            organizationId={organizationId}
            options={options}
            initialData={initialData}
            onSuccess={() => setIsEditOpen(false)}
            setOpen={setIsEditOpen}
          />
        </DialogContent>
      </Dialog>

      <BarcodeLabelPrintModal
        open={isBarcodeOpen}
        onOpenChange={setIsBarcodeOpen}
        productName={name}
        productSku={sku ?? null}
        basePriceCents={basePrice}
        variants={variants.map((v) => ({
          id: v.id,
          sku: v.sku ?? undefined,
          colorId: v.colorId,
          sizeId: v.sizeId,
        }))}
        options={options}
      />

      <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
        <DialogContent className="bg-card max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Estoque</DialogTitle>
            <DialogDescription>
              Adicione a quantidade de novos itens que chegaram para cada loja.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {hasVariants && (
              <div className="grid gap-2">
                <Label>Variante</Label>
                <Select
                  value={addStockVariantId ?? ""}
                  onValueChange={(val) => {
                    setAddStockVariantId(val || null);
                    setAddStockQuantities({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a variante" />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => {
                      const total = v.inventory.reduce(
                        (s, i) => s + (i.quantity ?? 0),
                        0,
                      );
                      return (
                        <SelectItem key={v.id} value={v.id}>
                          {getVariantLabel(v)} ({total} un)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(!hasVariants || addStockVariantId) && (
              <div className="space-y-4">
                <Label>Quantidade por Loja</Label>
                {options.stores.map((store) => {
                  const currentStock = hasVariants && addStockVariantId
                    ? variants
                        .find((v) => v.id === addStockVariantId)
                        ?.inventory.find((i) => i.storeId === store.id)?.quantity ?? 0
                    : inventory.find((i) => i.storeId === store.id)?.quantity ?? 0;

                  return (
                    <div key={store.id} className="flex items-center justify-between gap-4 border p-3 rounded-md">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{store.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Atual: {currentStock} un
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">+</span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          className="w-20 h-8"
                          value={addStockQuantities[store.id] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (Number(val) < 0) return;
                            setAddStockQuantities((prev) => ({
                              ...prev,
                              [store.id]: val,
                            }));
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddStockOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                addStockLoading ||
                (hasVariants && !addStockVariantId) ||
                Object.values(addStockQuantities).every((q) => !q || Number(q) <= 0)
              }
              onClick={async () => {
                const entries = Object.entries(addStockQuantities)
                  .map(([storeId, qty]) => ({
                    storeId,
                    quantity: Number(qty),
                  }))
                  .filter((e) => e.quantity > 0);

                if (entries.length === 0) return;

                setAddStockLoading(true);
                const result = await addIncomingStock(
                  id,
                  addStockVariantId,
                  entries
                );
                setAddStockLoading(false);

                if (result.error) {
                  toast.error(result.error);
                  return;
                }

                toast.success(result.message);
                setIsAddStockOpen(false);
                setAddStockVariantId(null);
                setAddStockQuantities({});
              }}
            >
              {addStockLoading ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir para outra loja</DialogTitle>
            <DialogDescription>
              Escolha a quantidade e a loja de destino para {name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {hasVariants && (
              <div className="grid gap-2">
                <Label>Variante</Label>
                <Select
                  value={transferVariantId ?? ""}
                  onValueChange={(val) => {
                    setTransferVariantId(val || null);
                    setTransferFromStoreId("");
                    setTransferToStoreId("");
                    setTransferQty("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a variante" />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((v) => {
                      const total = v.inventory.reduce(
                        (s, i) => s + (i.quantity ?? 0),
                        0,
                      );
                      return (
                        <SelectItem key={v.id} value={v.id}>
                          {getVariantLabel(v)} ({total} un)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Loja de origem</Label>
              <Select
                value={transferFromStoreId}
                onValueChange={(val) => {
                  setTransferFromStoreId(val);
                  setTransferToStoreId("");
                  setTransferQty("");
                }}
                disabled={
                  hasVariants && !transferVariantId
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja de origem" />
                </SelectTrigger>
                <SelectContent>
                  {hasVariants && transferVariantId
                    ? variants
                        .find((v) => v.id === transferVariantId)
                        ?.inventory.filter((i) => (i.quantity ?? 0) > 0)
                        .map((inv) => ({
                          storeId: inv.storeId,
                          quantity: inv.quantity ?? 0,
                        }))
                        .map(({ storeId, quantity }) => (
                          <SelectItem key={storeId} value={storeId}>
                            {options.stores.find((s) => s.id === storeId)?.name ??
                              storeId}{" "}
                            ({quantity} un)
                          </SelectItem>
                        )) ?? []
                    : inventory
                        .filter((i) => (i.quantity ?? 0) > 0)
                        .map((inv) => (
                          <SelectItem
                            key={inv.storeId}
                            value={inv.storeId}
                          >
                            {options.stores.find(
                              (s) => s.id === inv.storeId,
                            )?.name ?? inv.storeId}{" "}
                            ({inv.quantity} un)
                          </SelectItem>
                        ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Loja de destino</Label>
              <Select
                value={transferToStoreId}
                onValueChange={setTransferToStoreId}
                disabled={!transferFromStoreId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja de destino" />
                </SelectTrigger>
                <SelectContent>
                  {options.stores
                    .filter((s) => s.id !== transferFromStoreId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Quantidade (máx. {maxTransferQty})</Label>
              <Input
                type="number"
                min={1}
                max={maxTransferQty}
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                placeholder="0"
                disabled={!transferFromStoreId || !transferToStoreId}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransferOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                transferLoading ||
                !transferFromStoreId ||
                !transferToStoreId ||
                !transferQty ||
                (hasVariants && !transferVariantId) ||
                Number(transferQty) < 1 ||
                Number(transferQty) > maxTransferQty
              }
              onClick={async () => {
                const qty = Number(transferQty);
                if (qty < 1 || qty > maxTransferQty) return;
                setTransferLoading(true);
                const result = await transferStock(
                  id,
                  transferVariantId,
                  transferFromStoreId,
                  transferToStoreId,
                  qty,
                );
                setTransferLoading(false);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(result.message);
                setIsTransferOpen(false);
                setTransferFromStoreId("");
                setTransferToStoreId("");
                setTransferVariantId(null);
                setTransferQty("");
              }}
            >
              {transferLoading ? "Transferindo…" : "Transferir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-card w-[90vw] sm:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">
              Você tem certeza?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              Isso excluirá permanentemente {name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground w-full sm:w-auto"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
