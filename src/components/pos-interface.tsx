"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Store,
  ChevronDown,
  Check,
  LayoutDashboard,
  LockKeyholeOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { selectStoreAction } from "@/actions/pos";
import { PosCheckoutModal } from "@/components/pos-checkout-modal";

type Product = {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  sku: string | null;
  description: string | null;
  totalStock: number;
  category: { name: string } | null;
  variants: Variant[];
};

type Variant = {
  id: string;
  sku: string;
  size: { name: string; order?: number | null | undefined } | null;
  color: { name: string; hex: string | null } | null;
  inventory: { quantity: number }[];
};

type CartItem = {
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

interface POSInterfaceProps {
  store: { id: string; name: string };
  organization: { name: string; logoUrl: string | null } | null;
  products: Product[];
  availableStores?: { id: string; name: string }[];
  canSwitchStore?: boolean;
}

export function POSInterface({
  store,
  organization,
  products,
  availableStores = [],
  canSwitchStore = false,
}: Readonly<POSInterfaceProps>) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleId] = useState<string>(() => {
    // Generate sale ID only on client to avoid hydration mismatch
    if (typeof window === "undefined") return "";
    return Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // --- LÓGICA DE FILTRO ---
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  // --- LÓGICA DO CARRINHO ---
  const addToCart = (product: Product, variant?: Variant) => {
    const stockAvailable = variant
      ? variant.inventory[0]?.quantity || 0
      : product.totalStock;

    if (stockAvailable <= 0) {
      toast.error("Produto sem estoque!");
      return;
    }

    const cartId = variant ? variant.id : product.id;
    const variantDetails = variant
      ? `${variant.color?.name || ""} ${variant.size?.name || ""}`.trim()
      : "Padrão";

    setCart((prev) => {
      const existing = prev.find((item) => item.cartId === cartId);
      if (existing) {
        if (existing.quantity >= stockAvailable) {
          toast.warning("Estoque máximo atingido no carrinho.");
          return prev;
        }
        return prev.map((item) =>
          item.cartId === cartId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      toast.success("Adicionado à sacola");
      return [
        ...prev,
        {
          cartId,
          productId: product.id,
          variantId: variant?.id,
          name: product.name,
          image: product.imageUrl,
          details: variantDetails,
          price: product.basePrice,
          quantity: 1,
          maxStock: stockAvailable,
        },
      ];
    });

    setSelectedProduct(null);
    resetSelection();
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId) {
          const newQtd = item.quantity + delta;
          if (newQtd > item.maxStock) {
            toast.warning(`Máximo disponível: ${item.maxStock}`);
            return item;
          }
          return newQtd > 0 ? { ...item, quantity: newQtd } : item;
        }
        return item;
      })
    );
  };

  const resetSelection = () => {
    setSelectedSize(null);
    setSelectedColor(null);
  };

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {organization?.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt="Logo"
                className="h-6 sm:h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {organization?.name || "Vestra"}
              </span>
            )}
            <div
              className={`h-6 w-px bg-slate-200 mx-2 ${canSwitchStore ? "block" : "hidden sm:block"}`}
            />
            <div
              className={`text-xs sm:text-sm text-slate-500 items-center gap-1 ${canSwitchStore ? "flex" : "hidden sm:flex"}`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              {canSwitchStore && availableStores.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 -mx-1 gap-1 font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      aria-label="Trocar loja"
                    >
                      <Store className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[140px]">{store.name}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    {availableStores.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onSelect={() => selectStoreAction(s.id)}
                        className="flex items-center gap-2"
                      >
                        {s.id === store.id ? (
                          <Check className="h-4 w-4 shrink-0 text-green-600" />
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="truncate">{s.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span>{store.name}</span>
              )}
            </div>
            {canSwitchStore && (
              <Link
                href="/dashboard/cash-closure"
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 ml-2 px-2 py-1 rounded hover:bg-slate-100 transition-colors shrink-0"
                title="Fechar caixa"
              >
                <LockKeyholeOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fechar Caixa</span>
              </Link>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 ml-2 px-2 py-1 rounded hover:bg-slate-100 transition-colors shrink-0"
              title="Acessar painel administrativo"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Painel</span>
            </Link>
          </div>

          <div className="w-full sm:flex-1 sm:max-w-lg sm:mx-4 order-3 sm:order-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-slate-900" />
              <Input
                placeholder="O que você está procurando? (Nome, SKU)"
                className="pl-10 pr-4 text-sm sm:text-base bg-slate-100 border-transparent focus:bg-white focus:border-slate-300 transition-all rounded-full w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden relative order-2 sm:order-3 shrink-0"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag size={20} className="sm:w-6 sm:h-6" />
            {cart.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </Button>
        </header>

        {/* Grid de Produtos */}
        <ScrollArea className="flex-1 p-3 sm:p-4 md:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Catálogo
            </h2>
            <p className="text-sm sm:text-base text-slate-500">
              Selecione os itens para adicionar à venda.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6 pb-20">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden"
                onClick={() => setSelectedProduct(product)}
              >
                {/* Imagem do Produto */}
                <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-4xl">
                      {product.name[0]}
                    </div>
                  )}

                  {product.totalStock <= 5 && product.totalStock > 0 && (
                    <Badge className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-amber-500 text-white border-0 text-xs">
                      Restam {product.totalStock}
                    </Badge>
                  )}
                  {product.totalStock === 0 && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <Badge
                        variant="destructive"
                        className="text-xs sm:text-sm"
                      >
                        Esgotado
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="p-2 sm:p-3 md:p-4 flex flex-col flex-1">
                  <div className="text-xs text-slate-500 mb-1">
                    {product.category?.name || "Geral"}
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900 line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                    <span className="font-bold text-base sm:text-lg">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(product.basePrice / 100)}
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300 flex-shrink-0">
                      <Plus size={14} className="sm:w-4 sm:h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="hidden lg:flex w-[380px] xl:w-[420px] bg-white border-l shadow-2xl z-20 flex-col h-full">
        <div className="p-4 sm:p-5 md:p-6 border-b flex items-center justify-between bg-white">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Sacola
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 truncate">
              ID da Venda: #{saleId}
            </p>
          </div>
          <div className="bg-slate-100 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ml-2">
            {cart.reduce((acc, i) => acc + i.quantity, 0)} itens
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 sm:p-5 md:p-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 sm:space-y-4 px-4">
              <ShoppingBag
                size={48}
                className="sm:w-16 sm:h-16"
                strokeWidth={1}
              />
              <p className="text-base sm:text-lg font-medium text-slate-900 text-center">
                Sua sacola está vazia
              </p>
              <p className="text-center text-sm sm:text-base max-w-[200px]">
                Adicione produtos do catálogo para começar a venda.
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {cart.map((item) => (
                <div key={item.cartId} className="flex gap-3 sm:gap-4">
                  <div className="w-16 h-20 sm:w-20 sm:h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Detalhes */}
                  <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                    <div className="min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-semibold text-sm sm:text-base text-slate-900 line-clamp-2 leading-tight flex-1 min-w-0">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.cartId)}
                          className="text-slate-400 hover:text-red-500 flex-shrink-0"
                          aria-label="Remover item"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                        {item.details}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="flex items-center border border-slate-200 rounded-md">
                        <button
                          className="px-2 py-1 hover:bg-slate-50 text-slate-600"
                          onClick={() => updateQuantity(item.cartId, -1)}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={12} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                        <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          className="px-2 py-1 hover:bg-slate-50 text-slate-600"
                          onClick={() => updateQuantity(item.cartId, 1)}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={12} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                      <div className="font-bold text-sm sm:text-base text-slate-900 flex-shrink-0">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format((item.price * item.quantity) / 100)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 sm:p-5 md:p-6 bg-slate-50 border-t space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm text-slate-600">
              <span>Subtotal</span>
              <span>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(subtotal / 100)}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-slate-600">
              <span>Descontos</span>
              <span>-</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base sm:text-lg font-bold text-slate-900 pt-2">
              <span>Total</span>
              <span>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(subtotal / 100)}
              </span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 sm:h-12 text-sm sm:text-base shadow-lg shadow-indigo-200"
            disabled={cart.length === 0}
            onClick={() => {
              setIsCheckoutOpen(true);
            }}
          >
            Finalizar Compra
          </Button>
        </div>
      </div>

      <PosCheckoutModal
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        storeId={store.id}
        cart={cart}
        subtotal={subtotal}
        onSuccess={() => {
          setCart([]);
          setIsCartOpen(false);
        }}
      />

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="lg:hidden max-w-full h-[90vh] m-0 rounded-t-2xl rounded-b-none p-0 flex flex-col">
          <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Sacola
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 truncate">
                ID da Venda: #{saleId}
              </p>
            </div>
            <div className="bg-slate-100 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium shrink-0 ml-2">
              {cart.reduce((acc, i) => acc + i.quantity, 0)} itens
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 sm:p-5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 sm:space-y-4 px-4">
                <ShoppingBag
                  size={48}
                  className="sm:w-16 sm:h-16"
                  strokeWidth={1}
                />
                <p className="text-base sm:text-lg font-medium text-slate-900 text-center">
                  Sua sacola está vazia
                </p>
                <p className="text-center text-sm sm:text-base max-w-[200px]">
                  Adicione produtos do catálogo para começar a venda.
                </p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {cart.map((item) => (
                  <div key={item.cartId} className="flex gap-3 sm:gap-4">
                    <div className="w-16 h-20 sm:w-20 sm:h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                      <div className="min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-semibold text-sm sm:text-base text-slate-900 line-clamp-2 leading-tight flex-1 min-w-0">
                            {item.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.cartId)}
                            className="text-slate-400 hover:text-red-500 shrink-0"
                            aria-label="Remover item"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">
                          {item.details}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <div className="flex items-center border border-slate-200 rounded-md">
                          <button
                            className="px-2 py-1 hover:bg-slate-50 text-slate-600"
                            onClick={() => updateQuantity(item.cartId, -1)}
                            aria-label="Diminuir quantidade"
                          >
                            <Minus size={12} className="sm:w-3.5 sm:h-3.5" />
                          </button>
                          <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            className="px-2 py-1 hover:bg-slate-50 text-slate-600"
                            onClick={() => updateQuantity(item.cartId, 1)}
                            aria-label="Aumentar quantidade"
                          >
                            <Plus size={12} className="sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                        <div className="font-bold text-sm sm:text-base text-slate-900 shrink-0">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format((item.price * item.quantity) / 100)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 sm:p-5 bg-slate-50 border-t space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                <span>Subtotal</span>
                <span>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(subtotal / 100)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                <span>Descontos</span>
                <span>-</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base sm:text-lg font-bold text-slate-900 pt-2">
                <span>Total</span>
                <span>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(subtotal / 100)}
                </span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 sm:h-12 text-sm sm:text-base shadow-lg shadow-indigo-200"
              disabled={cart.length === 0}
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
            >
              Finalizar Compra
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl p-0 overflow-hidden gap-0">
          {selectedProduct && (
            <>
              <DialogTitle className="sr-only">
                {selectedProduct.name}
              </DialogTitle>
              <div className="flex flex-col md:flex-row h-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
                {/* Imagem Grande */}
                <div className="w-full md:w-[55%] lg:w-[60%] bg-slate-100 flex-shrink-0 h-80 sm:h-96 md:h-full md:max-h-[90vh] flex items-center justify-center overflow-hidden">
                  {selectedProduct.imageUrl && (
                    <img
                      src={selectedProduct.imageUrl}
                      className="w-full h-full object-contain md:object-cover"
                      alt={selectedProduct.name}
                    />
                  )}
                </div>

                {/* Info e Seleção */}
                <div className="w-full md:w-[45%] lg:w-[40%] p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col overflow-y-auto overflow-x-hidden">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                        {selectedProduct.name}
                      </h2>
                      {selectedProduct.sku && (
                        <p className="text-slate-500 mt-1 text-xs sm:text-sm">
                          {selectedProduct.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-indigo-600">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(selectedProduct.basePrice / 100)}
                    </div>
                  </div>

                  <Separator className="my-4 sm:my-5 md:my-6" />

                  {/* Seleção de Tamanhos e Cores (Se tiver variantes) */}
                  {selectedProduct.variants.length > 0 ? (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="space-y-2 sm:space-y-3">
                        <label className="text-xs sm:text-sm font-medium text-slate-900">
                          Opções Disponíveis
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:gap-3 min-w-0">
                          {[...selectedProduct.variants]
                            .sort(
                              (a, b) =>
                                (a.size?.order ?? 0) - (b.size?.order ?? 0)
                            )
                            .map((variant) => {
                              const stock =
                                variant.inventory[0]?.quantity || 0;
                              return (
                                <button
                                  key={variant.id}
                                  disabled={stock === 0}
                                  onClick={() =>
                                    addToCart(selectedProduct, variant)
                                  }
                                  className={`
                                    flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border text-xs sm:text-sm transition-all w-full min-w-0
                                    ${
                                      stock === 0
                                        ? "opacity-50 bg-slate-50 cursor-not-allowed"
                                        : "hover:border-indigo-600 hover:bg-indigo-50 bg-white border-slate-200"
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {variant.color?.hex && (
                                      <div
                                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 flex-shrink-0"
                                        style={{
                                          backgroundColor: variant.color.hex,
                                        }}
                                        title={variant.color.name}
                                      />
                                    )}
                                    <div className="flex flex-col items-start min-w-0 flex-1">
                                      <span className="font-semibold text-slate-700 truncate w-full text-xs sm:text-sm">
                                        {variant.size?.name}{" "}
                                        {variant.color?.name &&
                                          `- ${variant.color.name}`}
                                      </span>
                                      <span className="text-xs text-slate-500 truncate w-full">
                                        SKU: {variant.sku}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                                      stock > 0
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {stock} un
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 sm:py-4">
                      <p className="text-sm sm:text-base text-slate-600 mb-3 sm:mb-4">
                        Produto único (sem variação).
                      </p>
                      <Button
                        size="lg"
                        className="w-full bg-slate-900 hover:bg-slate-800 h-10 sm:h-12 text-sm sm:text-base"
                        onClick={() => addToCart(selectedProduct)}
                        disabled={selectedProduct.totalStock === 0}
                      >
                        {selectedProduct.totalStock > 0
                          ? "Adicionar à Sacola"
                          : "Esgotado"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
