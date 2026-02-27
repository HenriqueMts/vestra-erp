"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
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
import { registerExchangeOrReturn, registerReturnAddStock } from "@/actions/inventory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Product = {
  id: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  sku: string | null;
  description: string | null;
  totalStock: number;
  category: { id: string; name: string } | null;
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
  const [saleId, setSaleId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isExchangeReturnOpen, setIsExchangeReturnOpen] = useState(false);
  const [exchangeType, setExchangeType] = useState<"exchange" | "return">("exchange");
  const [exchangeLoading, setExchangeLoading] = useState(false);
  // Devolução: um só produto (com estoque) que sai
  const [exchangeProduct, setExchangeProduct] = useState<Product | null>(null);
  const [exchangeVariantId, setExchangeVariantId] = useState<string | null>(null);
  const [exchangeQty, setExchangeQty] = useState("");
  // Troca: produto que o cliente devolve (qualquer) + produto que sai do estoque (com estoque)
  const [exchangeProductIn, setExchangeProductIn] = useState<Product | null>(null);
  const [exchangeVariantIdIn, setExchangeVariantIdIn] = useState<string | null>(null);
  const [exchangeProductOut, setExchangeProductOut] = useState<Product | null>(null);
  const [exchangeVariantIdOut, setExchangeVariantIdOut] = useState<string | null>(null);
  const [exchangeQtyOut, setExchangeQtyOut] = useState("");

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const router = useRouter();

  useEffect(() => {
    // Gera o ID da venda apenas após o componente montar no cliente
    const id = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    setSaleId(id);
  }, []);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    products.forEach((p) => {
      if (p.category?.id && p.category.name) {
        seen.set(p.category.id, p.category.name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  // --- LÓGICA DE FILTRO ---
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !selectedCategoryId || p.category?.id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

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

  const exchangeSubmitLabel = exchangeLoading
    ? "Registrando…"
    : exchangeType === "exchange"
      ? "Registrar troca"
      : "Registrar devolução";

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-background overflow-hidden font-sans min-h-0">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="bg-card border-b border-border shrink-0 sticky top-0 z-10">
          <div className="px-2 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 flex flex-col gap-2 sm:gap-3">
            {/* Linha 1: Logo, loja, ações e sacola */}
            <div className="flex items-center justify-between gap-2 min-w-0 w-full">
              <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                {organization?.logoUrl ? (
                  <img
                    src={organization.logoUrl}
                    alt="Logo"
                    className="h-6 sm:h-8 w-auto object-contain shrink-0"
                  />
                ) : (
                  <span className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
                    {organization?.name || "Vestra"}
                  </span>
                )}
                <div
                  className={`h-4 sm:h-6 w-px bg-border shrink-0 ${canSwitchStore ? "block" : "hidden sm:block"}`}
                />
                <div
                  className={`text-xs text-muted-foreground items-center gap-1 min-w-0 ${canSwitchStore ? "flex" : "hidden sm:flex"}`}
                >
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary shrink-0" />
                  {canSwitchStore && availableStores.length > 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 sm:h-8 py-1 px-1.5 sm:px-2 gap-1 font-normal text-muted-foreground hover:text-foreground hover:bg-muted min-w-0 max-w-[120px] sm:max-w-[140px]"
                          aria-label="Trocar loja"
                        >
                          <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                          <span className="truncate">{store.name}</span>
                          <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
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
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            ) : (
                              <span className="w-4" />
                            )}
                            <span className="truncate">{s.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="truncate">{store.name}</span>
                  )}
                </div>
                {canSwitchStore && (
                  <Link
                    href="/dashboard/cash-closure"
                    className="flex items-center shrink-0 p-1.5 sm:px-2 sm:py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Fechar caixa"
                  >
                    <LockKeyholeOpen className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline ml-1 text-xs">Fechar Caixa</span>
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="flex items-center shrink-0 p-1.5 sm:px-2 sm:py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Painel"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1 text-xs">Painel</span>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 p-1.5 sm:px-2 sm:py-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => {
                    setIsExchangeReturnOpen(true);
                    setExchangeType("exchange");
                    setExchangeProduct(null);
                    setExchangeVariantId(null);
                    setExchangeQty("");
                    setExchangeProductIn(null);
                    setExchangeVariantIdIn(null);
                    setExchangeProductOut(null);
                    setExchangeVariantIdOut(null);
                    setExchangeQtyOut("");
                  }}
                  title="Troca ou devolução"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1 text-xs">Troca / Devolução</span>
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden relative shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => setIsCartOpen(true)}
                aria-label="Abrir sacola"
              >
                <ShoppingBag size={22} className="sm:w-6 sm:h-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                    {cart.reduce((acc, i) => acc + i.quantity, 0)}
                  </span>
                )}
              </Button>
            </div>

            {/* Linha 2: Busca e categorias em coluna, sempre visíveis sem sobrepor */}
              <div className="w-full min-w-0 flex flex-col gap-2">
              <div className="relative w-full min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar (nome ou código)"
                  className="pl-9 pr-3 sm:pl-10 sm:pr-4 text-sm bg-muted border-transparent focus:bg-background focus:border-input rounded-full w-full min-w-0"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (filteredProducts.length === 1) {
                      e.preventDefault();
                      const product = filteredProducts[0];
                      const variant =
                        product.variants?.length === 1
                          ? product.variants[0]
                          : undefined;
                      addToCart(product, variant);
                      setSearch("");
                    }
                  }}
                />
              </div>
              {categories.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scroll-smooth [scrollbar-width:thin]">
                  <Button
                    type="button"
                    variant={selectedCategoryId === null ? "default" : "outline"}
                    size="sm"
                    className="shrink-0 rounded-full h-7 sm:h-8 text-xs font-medium"
                    onClick={() => setSelectedCategoryId(null)}
                  >
                    Todas
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      type="button"
                      variant={
                        selectedCategoryId === cat.id ? "default" : "outline"
                      }
                      size="sm"
                      className="shrink-0 rounded-full h-7 sm:h-8 text-xs font-medium whitespace-nowrap"
                      onClick={() => setSelectedCategoryId(cat.id)}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Grid de Produtos */}
        <ScrollArea className="flex-1 min-h-0 overflow-auto">
          <div className="p-2 sm:p-4 md:p-6 pb-24 lg:pb-6">
            <div className="mb-3 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">
                Catálogo
              </h2>
              <p className="text-xs sm:text-base text-muted-foreground mt-0.5">
                Selecione os itens para adicionar à venda.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden"
                onClick={() => setSelectedProduct(product)}
              >
                {/* Imagem do Produto */}
                <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-4xl">
                      {product.name[0]}
                    </div>
                  )}

                  {product.totalStock <= 5 && product.totalStock > 0 && (
                    <Badge className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-amber-500 text-primary-foreground border-0 text-xs">
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

                <div className="p-2 sm:p-3 md:p-4 flex flex-col flex-1 min-w-0">
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">
                    {product.category?.name || "Geral"}
                  </div>
                  <h3 className="font-semibold text-xs sm:text-base text-foreground line-clamp-2 sm:line-clamp-1 leading-tight">
                    {product.name}
                  </h3>
                  <div className="mt-auto pt-1.5 sm:pt-2 flex items-center justify-between gap-1 sm:gap-2">
                    <span className="font-bold text-sm sm:text-lg truncate min-w-0 text-foreground">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(product.basePrice / 100)}
                    </span>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300 shrink-0">
                      <Plus size={12} className="sm:w-4 sm:h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </ScrollArea>

        {/* Barra fixa inferior em telas menores: sacola + finalizar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center gap-2 p-2 sm:p-3 bg-white border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11 sm:h-12 gap-2 text-sm font-medium"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingBag className="h-5 w-5 shrink-0" />
            <span>Sacola</span>
            <span className="bg-muted px-2 py-0.5 rounded-full text-xs font-bold text-foreground">
              {cart.reduce((acc, i) => acc + i.quantity, 0)} itens
            </span>
          </Button>
          <Button
            type="button"
            className="flex-1 sm:flex-none sm:min-w-[140px] h-11 sm:h-12 bg-indigo-600 hover:bg-indigo-700 font-bold text-sm"
            disabled={cart.length === 0}
            onClick={() => {
              if (cart.length > 0) {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }
            }}
          >
            Finalizar Compra
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[340px] xl:w-[380px] 2xl:w-[420px] bg-card border-l border-border shadow-xl shrink-0 flex-col h-full min-h-0">
        <div className="p-4 sm:p-5 md:p-6 border-b border-border flex items-center justify-between bg-card">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Sacola
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              ID da Venda: #{saleId ?? "----"}
            </p>
          </div>
          <div className="bg-muted px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ml-2 text-foreground">
            {cart.reduce((acc, i) => acc + i.quantity, 0)} itens
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 p-4 sm:p-5 md:p-6">
          {cart.length === 0 ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center text-muted-foreground space-y-3 sm:space-y-4 px-4">
              <ShoppingBag
                size={48}
                className="sm:w-16 sm:h-16"
                strokeWidth={1}
              />
              <p className="text-base sm:text-lg font-medium text-foreground text-center">
                Sua sacola está vazia
              </p>
              <p className="text-center text-sm sm:text-base max-w-[200px] text-muted-foreground">
                Adicione produtos do catálogo para começar a venda.
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {cart.map((item) => (
                <div key={item.cartId} className="flex gap-3 sm:gap-4">
                  <div className="w-16 h-20 sm:w-20 sm:h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0 border border-border">
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
                        <h4 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 leading-tight flex-1 min-w-0">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.cartId)}
                          className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          aria-label="Remover item"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                        {item.details}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="flex items-center border border-border rounded-md">
                        <button
                          className="px-2 py-1 hover:bg-muted text-muted-foreground"
                          onClick={() => updateQuantity(item.cartId, -1)}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={12} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                        <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          className="px-2 py-1 hover:bg-muted text-muted-foreground"
                          onClick={() => updateQuantity(item.cartId, 1)}
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={12} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                      <div className="font-bold text-sm sm:text-base text-foreground flex-shrink-0">
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

        <div className="p-4 sm:p-5 md:p-6 bg-muted/40 border-t border-border space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(subtotal / 100)}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
              <span>Descontos</span>
              <span>-</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base sm:text-lg font-bold text-foreground pt-2">
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
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 sm:h-12 text-sm sm:text-base shadow-lg shadow-primary/30"
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
          router.refresh();
        }}
      />

      <Dialog open={isExchangeReturnOpen} onOpenChange={setIsExchangeReturnOpen}>
        <DialogContent className="bg-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Troca ou Devolução</DialogTitle>
            <DialogDescription>
              Loja: {store.name}. Troca: produto que o cliente devolve (qualquer) + produto que sai do estoque (com estoque). Devolução: qualquer produto — quantidade é adicionada ao estoque.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Motivo</Label>
              <Select
                value={exchangeType}
                onValueChange={(v) => {
                  setExchangeType(v as "exchange" | "return");
                  setExchangeProduct(null);
                  setExchangeVariantId(null);
                  setExchangeQty("");
                  setExchangeProductIn(null);
                  setExchangeVariantIdIn(null);
                  setExchangeProductOut(null);
                  setExchangeVariantIdOut(null);
                  setExchangeQtyOut("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exchange">Troca</SelectItem>
                  <SelectItem value="return">Devolução</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exchangeType === "exchange" ? (
              <>
                <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Produto que o cliente está devolvendo (qualquer)
                  </p>
                  <div className="grid gap-2">
                    <Label className="text-foreground">Produto</Label>
                    <Select
                      value={exchangeProductIn?.id ?? ""}
                      onValueChange={(val) => {
                        const p = products.find((x) => x.id === val) ?? null;
                        setExchangeProductIn(p);
                        setExchangeVariantIdIn(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.totalStock > 0 ? ` (${p.totalStock} un)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {exchangeProductIn && exchangeProductIn.variants.length > 0 && (
                    <div className="grid gap-2">
                      <Label className="text-foreground">Variante</Label>
                      <Select
                        value={exchangeVariantIdIn ?? ""}
                        onValueChange={(val) => setExchangeVariantIdIn(val || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a variante" />
                        </SelectTrigger>
                        <SelectContent>
                          {exchangeProductIn.variants.map((v) => {
                            const qty = v.inventory.reduce(
                              (s, i) => s + (i.quantity ?? 0),
                              0,
                            );
                            return (
                              <SelectItem key={v.id} value={v.id}>
                                {v.size?.name ?? ""} {v.color?.name ?? ""}
                                {qty > 0 ? ` (${qty} un)` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-xs font-medium text-foreground">
                    Produto que sai do estoque (o que o cliente leva)
                  </p>
                  <div className="grid gap-2">
                    <Label className="text-foreground">Produto</Label>
                    <Select
                      value={exchangeProductOut?.id ?? ""}
                      onValueChange={(val) => {
                        const p = products.find((x) => x.id === val) ?? null;
                        setExchangeProductOut(p);
                        setExchangeVariantIdOut(null);
                        setExchangeQtyOut("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto com estoque" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter((p) => p.totalStock > 0)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.totalStock} un)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {exchangeProductOut && exchangeProductOut.variants.length > 0 && (
                    <div className="grid gap-2">
                      <Label className="text-foreground">Variante</Label>
                      <Select
                        value={exchangeVariantIdOut ?? ""}
                        onValueChange={(val) => {
                          setExchangeVariantIdOut(val || null);
                          setExchangeQtyOut("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a variante" />
                        </SelectTrigger>
                        <SelectContent>
                          {exchangeProductOut.variants.map((v) => {
                            const qty = v.inventory.reduce(
                              (s, i) => s + (i.quantity ?? 0),
                              0,
                            );
                            if (qty <= 0) return null;
                            return (
                              <SelectItem key={v.id} value={v.id}>
                                {v.size?.name ?? ""} {v.color?.name ?? ""} ({qty} un)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label className="text-foreground">
                      Quantidade
                      {exchangeProductOut &&
                        (exchangeProductOut.variants.length > 0 && exchangeVariantIdOut
                          ? ` (máx. ${
                              exchangeProductOut.variants.find(
                                (v) => v.id === exchangeVariantIdOut,
                              )?.inventory.reduce((s, i) => s + (i.quantity ?? 0), 0) ?? 0
                            })`
                          : ` (máx. ${exchangeProductOut.totalStock})`)}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={
                        exchangeProductOut
                          ? exchangeProductOut.variants.length > 0 && exchangeVariantIdOut
                            ? exchangeProductOut.variants.find(
                                (v) => v.id === exchangeVariantIdOut,
                              )?.inventory.reduce((s, i) => s + (i.quantity ?? 0), 0) ?? 0
                            : exchangeProductOut.totalStock
                          : 0
                      }
                      value={exchangeQtyOut}
                      onChange={(e) => setExchangeQtyOut(e.target.value)}
                      placeholder="0"
                      disabled={
                        !exchangeProductOut ||
                        (exchangeProductOut.variants.length > 0 && !exchangeVariantIdOut)
                      }
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Produto que o cliente está devolvendo (qualquer produto — entrada no estoque)
                  </p>
                  <div className="grid gap-2">
                    <Label className="text-foreground">Produto</Label>
                    <Select
                      value={exchangeProduct?.id ?? ""}
                      onValueChange={(val) => {
                        const p = products.find((x) => x.id === val) ?? null;
                        setExchangeProduct(p);
                        setExchangeVariantId(null);
                        setExchangeQty("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.totalStock > 0 ? ` (${p.totalStock} un)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {exchangeProduct && exchangeProduct.variants.length > 0 && (
                    <div className="grid gap-2">
                      <Label className="text-foreground">Variante</Label>
                      <Select
                        value={exchangeVariantId ?? ""}
                        onValueChange={(val) => {
                          setExchangeVariantId(val || null);
                          setExchangeQty("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a variante" />
                        </SelectTrigger>
                        <SelectContent>
                          {exchangeProduct.variants.map((v) => {
                            const qty = v.inventory.reduce(
                              (s, i) => s + (i.quantity ?? 0),
                              0,
                            );
                            return (
                              <SelectItem key={v.id} value={v.id}>
                                {v.size?.name ?? ""} {v.color?.name ?? ""}
                                {qty > 0 ? ` (${qty} un)` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label className="text-foreground">Quantidade devolvida</Label>
                    <Input
                      type="number"
                      min={1}
                      value={exchangeQty}
                      onChange={(e) => setExchangeQty(e.target.value)}
                      placeholder="0"
                      disabled={
                        !exchangeProduct ||
                        (exchangeProduct.variants.length > 0 && !exchangeVariantId)
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExchangeReturnOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                exchangeLoading ||
                (exchangeType === "exchange"
                  ? !exchangeProductOut ||
                    !exchangeQtyOut ||
                    (exchangeProductOut?.variants.length
                      ? !exchangeVariantIdOut
                      : false) ||
                    Number(exchangeQtyOut) < 1 ||
                    Number(exchangeQtyOut) >
                      (exchangeProductOut
                        ? exchangeProductOut.variants.length > 0 && exchangeVariantIdOut
                          ? exchangeProductOut.variants.find(
                              (v) => v.id === exchangeVariantIdOut,
                            )?.inventory.reduce((s, i) => s + (i.quantity ?? 0), 0) ?? 0
                          : exchangeProductOut.totalStock
                        : 0)
                  : !exchangeProduct ||
                    !exchangeQty ||
                    (exchangeProduct?.variants.length ? !exchangeVariantId : false) ||
                    Number(exchangeQty) < 1)
              }
              onClick={async () => {
                if (exchangeType === "exchange") {
                  if (!exchangeProductOut) return;
                  const qty = Number(exchangeQtyOut);
                  const maxQty =
                    exchangeProductOut.variants.length > 0 && exchangeVariantIdOut
                      ? exchangeProductOut.variants.find(
                          (v) => v.id === exchangeVariantIdOut,
                        )?.inventory.reduce((s, i) => s + (i.quantity ?? 0), 0) ?? 0
                      : exchangeProductOut.totalStock;
                  if (qty < 1 || qty > maxQty) return;
                  setExchangeLoading(true);
                  const result = await registerExchangeOrReturn(
                    store.id,
                    exchangeProductOut.id,
                    exchangeVariantIdOut,
                    qty,
                    "exchange",
                  );
                  setExchangeLoading(false);
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(result.message);
                  setIsExchangeReturnOpen(false);
                  setExchangeProductIn(null);
                  setExchangeVariantIdIn(null);
                  setExchangeProductOut(null);
                  setExchangeVariantIdOut(null);
                  setExchangeQtyOut("");
                } else {
                  if (!exchangeProduct) return;
                  const qty = Number(exchangeQty);
                  if (qty < 1) return;
                  setExchangeLoading(true);
                  const result = await registerReturnAddStock(
                    store.id,
                    exchangeProduct.id,
                    exchangeVariantId,
                    qty,
                  );
                  setExchangeLoading(false);
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(result.message);
                  setIsExchangeReturnOpen(false);
                  setExchangeProduct(null);
                  setExchangeVariantId(null);
                  setExchangeQty("");
                }
                router.refresh();
              }}
            >
              {exchangeSubmitLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="lg:hidden max-w-full h-[90vh] m-0 rounded-t-2xl rounded-b-none p-0 flex flex-col">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card sticky top-0 z-10">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                Sacola
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                ID da Venda: #{saleId ?? "----"}
              </p>
            </div>
            <div className="bg-muted px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium shrink-0 ml-2 text-foreground">
              {cart.reduce((acc, i) => acc + i.quantity, 0)} itens
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 sm:p-5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 sm:space-y-4 px-4">
                <ShoppingBag
                  size={48}
                  className="sm:w-16 sm:h-16"
                  strokeWidth={1}
                />
                <p className="text-base sm:text-lg font-medium text-foreground text-center">
                  Sua sacola está vazia
                </p>
                <p className="text-center text-sm sm:text-base max-w-[200px] text-muted-foreground">
                  Adicione produtos do catálogo para começar a venda.
                </p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {cart.map((item) => (
                  <div key={item.cartId} className="flex gap-3 sm:gap-4">
                    <div className="w-16 h-20 sm:w-20 sm:h-24 bg-muted rounded-lg overflow-hidden shrink-0 border border-border">
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
                          <h4 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 leading-tight flex-1 min-w-0">
                            {item.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.cartId)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            aria-label="Remover item"
                          >
                            <Trash2 size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                          {item.details}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <div className="flex items-center border border-border rounded-md">
                          <button
                            className="px-2 py-1 hover:bg-muted text-muted-foreground"
                            onClick={() => updateQuantity(item.cartId, -1)}
                            aria-label="Diminuir quantidade"
                          >
                            <Minus size={12} className="sm:w-3.5 sm:h-3.5" />
                          </button>
                          <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            className="px-2 py-1 hover:bg-muted text-muted-foreground"
                            onClick={() => updateQuantity(item.cartId, 1)}
                            aria-label="Aumentar quantidade"
                          >
                            <Plus size={12} className="sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                        <div className="font-bold text-sm sm:text-base text-foreground shrink-0">
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

          <div className="p-4 sm:p-5 bg-muted/40 border-t border-border space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(subtotal / 100)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                <span>Descontos</span>
                <span>-</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base sm:text-lg font-bold text-foreground pt-2">
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
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 sm:h-12 text-sm sm:text-base shadow-lg shadow-primary/30"
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
                <div className="w-full md:w-[55%] lg:w-[60%] bg-muted flex-shrink-0 h-80 sm:h-96 md:h-full md:max-h-[90vh] flex items-center justify-center overflow-hidden">
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
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-tight">
                        {selectedProduct.name}
                      </h2>
                      {selectedProduct.sku && (
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                          {selectedProduct.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-primary">
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
                        <label className="text-xs sm:text-sm font-medium text-foreground">
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
                                        ? "opacity-50 bg-muted cursor-not-allowed"
                                        : "hover:border-primary hover:bg-primary/10 bg-card border-border"
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {variant.color?.hex && (
                                      <div
                                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-border flex-shrink-0"
                                        style={{
                                          backgroundColor: variant.color.hex,
                                        }}
                                        title={variant.color.name}
                                      />
                                    )}
                                    <div className="flex flex-col items-start min-w-0 flex-1">
                                      <span className="font-semibold text-foreground truncate w-full text-xs sm:text-sm">
                                        {variant.size?.name}{" "}
                                        {variant.color?.name &&
                                          `- ${variant.color.name}`}
                                      </span>
                                      <span className="text-xs text-muted-foreground truncate w-full">
                                        SKU: {variant.sku}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                                      stock > 0
                                        ? "bg-green-100 text-foreground"
                                        : "bg-red-100 text-foreground"
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
                      <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                        Produto único (sem variação).
                      </p>
                      <Button
                        size="lg"
                        className="w-full bg-primary hover:bg-primary/90 h-10 sm:h-12 text-sm sm:text-base"
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
