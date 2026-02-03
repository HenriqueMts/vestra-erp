import { Plus, Package, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";
import { getCurrentOrg } from "@/utils/auth";
import { getProductOptions } from "@/actions/products";
import Image from "next/image";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ProductForm } from "@/components/product-form";
import { ProductPagination } from "@/components/product-pagination";
import { ProductRowActions } from "@/components/product-row-actions";
import { ProductFilter } from "@/components/product-filter";

const ITEMS_PER_PAGE = 20;

export default async function ProductsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}>) {
  const queryParams = await searchParams;
  const query = queryParams?.q || "";
  const statusFilter = queryParams?.status || "";

  const currentPage = Number(queryParams?.page) || 1;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const { organizationId } = await getCurrentOrg();
  const options = await getProductOptions();

  const whereConditions = and(
    eq(products.organizationId, organizationId),
    query ? ilike(products.name, `%${query}%`) : undefined,
    statusFilter && statusFilter !== "all"
      ? eq(products.status, statusFilter as "active" | "inactive" | "archived")
      : undefined,
  );

  // --- 1. QUERY ATUALIZADA (INVENTORY) ---
  const allProducts = await db.query.products.findMany({
    where: whereConditions,
    with: {
      category: true,
      images: true,
      inventory: true, // <--- Agora buscamos o inventário também
    },
    orderBy: [desc(products.createdAt)],
    limit: ITEMS_PER_PAGE,
    offset: offset,
  });

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereConditions);

  const totalItems = Number(countResult.count);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const isFilteredResult =
    query.length > 0 || (statusFilter.length > 0 && statusFilter !== "all");
  const isListEmpty = totalItems === 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-2 w-full sm:w-auto">
          <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            Menu Principal <span className="text-slate-300">/</span>{" "}
            <span className="text-slate-900 font-semibold">Produtos</span>
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            Produtos
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {(!isListEmpty || isFilteredResult) && <ProductFilter />}

          {(!isListEmpty || isFilteredResult) && (
            <ModalCadastro
              categories={options.categories}
              organizationId={organizationId}
            />
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      {isListEmpty && !isFilteredResult ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl sm:rounded-2xl bg-white/50 space-y-4 p-6 sm:p-12">
          <div className="bg-slate-100 p-4 sm:p-6 rounded-2xl text-slate-400">
            <Package size={40} className="sm:w-12 sm:h-12" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
              Nenhum produto cadastrado
            </h3>
            <p className="text-slate-500 text-sm sm:text-base max-w-xs">
              Comece adicionando seus produtos para gerenciar o catálogo.
            </p>
          </div>
          <ModalCadastro
            centralizado
            categories={options.categories}
            organizationId={organizationId}
          />
        </div>
      ) : (
        <div className="space-y-4 w-full">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <div className="min-w-full">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[80px] py-4 pl-6"></TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                      Produto
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                      Categoria
                    </TableHead>
                    {/* NOVA COLUNA ESTOQUE */}
                    <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                      Estoque
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-4">
                      Preço Base
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isListEmpty ? (
                    <TableRow>
                      <TableCell
                        colSpan={7} // Ajustado para cobrir a nova coluna
                        className="h-24 text-center text-slate-500"
                      >
                        Nenhum produto encontrado com esses filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allProducts.map((product) => {
                      // CÁLCULO DO ESTOQUE TOTAL
                      // Soma a quantidade de todas as entradas de inventário (se tiver filiais, soma tudo)
                      const totalStock = product.inventory.reduce(
                        (acc, item) => acc + item.quantity,
                        0,
                      );

                      return (
                        <TableRow
                          key={product.id}
                          className="hover:bg-slate-50/50 transition-colors border-slate-50"
                        >
                          <TableCell className="py-4 pl-6 align-middle">
                            <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                              {product.imageUrl ? (
                                <Image
                                  src={product.imageUrl}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full w-full text-slate-300">
                                  <ImageIcon size={18} />
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="font-medium text-slate-700 align-middle">
                            {product.name}
                          </TableCell>

                          <TableCell className="text-slate-500 text-sm align-middle">
                            {product.category?.name || "Sem Categoria"}
                          </TableCell>

                          {/* EXIBIÇÃO DO ESTOQUE */}
                          <TableCell className="align-middle">
                            <span
                              className={`text-sm font-medium ${totalStock === 0 ? "text-red-500" : "text-slate-700"}`}
                            >
                              {totalStock} un
                            </span>
                          </TableCell>

                          <TableCell className="align-middle">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                product.status === "active"
                                  ? "bg-green-50 text-green-700"
                                  : product.status === "inactive"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {product.status === "active"
                                ? "Ativo"
                                : product.status === "inactive"
                                  ? "Inativo"
                                  : "Arquivado"}
                            </span>
                          </TableCell>

                          <TableCell className="text-slate-700 font-medium text-sm align-middle">
                            {formatCurrency(product.basePrice)}
                          </TableCell>

                          <TableCell className="align-middle">
                            <ProductRowActions
                              id={product.id}
                              status={product.status}
                              name={product.name}
                              basePrice={product.basePrice}
                              categoryId={product.categoryId}
                              description={product.description}
                              imageUrl={product.imageUrl}
                              images={product.images}
                              organizationId={organizationId}
                              categories={options.categories}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <ProductPagination
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </div>
      )}
    </div>
  );
}

function ModalCadastro({
  centralizado = false,
  categories,
  organizationId,
}: Readonly<{
  centralizado?: boolean;
  categories: { id: string; name: string }[];
  organizationId: string;
}>) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={`${centralizado ? "px-8 py-6 text-lg" : "px-4"} bg-[#1a1a1a] hover:bg-black text-white gap-2 transition-all`}
        >
          <Plus size={centralizado ? 22 : 18} />
          {centralizado ? "Adicionar Produto" : "Novo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Cadastrar Produto
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do produto, estoque inicial e fotos.
          </DialogDescription>
        </DialogHeader>
        <ProductForm categories={categories} organizationId={organizationId} />
      </DialogContent>
    </Dialog>
  );
}
