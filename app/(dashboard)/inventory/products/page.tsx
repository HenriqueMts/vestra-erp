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
import { ProductForm } from "@/components/product-form";
import { ProductPagination } from "@/components/product-pagination";
import { ProductRowActions } from "@/components/product-row-actions";
import { ProductFilter } from "@/components/product-filter";
import { RegisterModal } from "@/components/register-modal";

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

  const allProducts = await db.query.products.findMany({
    where: whereConditions,
    with: {
      category: true,
      images: true,
      inventory: true,
      variants: {
        with: {
          inventory: true,
        },
      },
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-2 w-full sm:w-auto">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            Menu Principal <span className="text-muted-foreground">/</span>{" "}
            <span className="text-foreground font-semibold">Produtos</span>
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Produtos
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {(!isListEmpty || isFilteredResult) && <ProductFilter />}
          {(!isListEmpty || isFilteredResult) && (
            <RegisterModal options={options} organizationId={organizationId} />
          )}
        </div>
      </div>

      {isListEmpty && !isFilteredResult ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl sm:rounded-2xl bg-card/50 space-y-4 sm:space-y-6 p-6 sm:p-12">
          <div className="bg-muted p-4 sm:p-6 rounded-2xl text-muted-foreground">
            <Package className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          <div className="text-center space-y-1 sm:space-y-2">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground">
              Nenhum produto cadastrado
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xs">
              Comece adicionando seus produtos para gerenciar o catálogo.
            </p>
          </div>

          <RegisterModal
            centralizado
            options={options}
            organizationId={organizationId}
          />
        </div>
      ) : (
        <div className="space-y-4 w-full">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
            <div className="min-w-full">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[60px] sm:w-[80px] py-3 sm:py-4 pl-4 sm:pl-6"></TableHead>
                    <TableHead className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 sm:py-4">
                      Produto
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 sm:py-4 hidden md:table-cell">
                      Categoria
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 sm:py-4 hidden lg:table-cell">
                      Estoque Total
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 sm:py-4">
                      Status
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 sm:py-4 hidden sm:table-cell">
                      Venda
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 sm:py-4 hidden lg:table-cell">
                      Custo
                    </TableHead>
                    <TableHead className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 sm:py-4 hidden xl:table-cell">
                      Lucro
                    </TableHead>
                    <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isListEmpty ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-muted-foreground text-sm"
                      >
                        Nenhum produto encontrado com esses filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allProducts.map((product) => {
                      let totalStock = 0;

                      if (product.variants && product.variants.length > 0) {
                        totalStock = product.variants.reduce(
                          (accVar, variant) => {
                            const varStock = variant.inventory.reduce(
                              (accInv, inv) => accInv + inv.quantity,
                              0,
                            );
                            return accVar + varStock;
                          },
                          0,
                        );
                      } else {
                        totalStock = product.inventory.reduce(
                          (acc, item) => acc + item.quantity,
                          0,
                        );
                      }

                      return (
                        <TableRow
                          key={product.id}
                          className="hover:bg-muted/50 transition-colors border-border"
                        >
                          <TableCell className="py-3 sm:py-4 pl-4 sm:pl-6 align-middle">
                            <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
                              {product.imageUrl ? (
                                <Image
                                  src={product.imageUrl}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 32px, 40px"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="font-medium text-foreground text-sm sm:text-base align-middle">
                            <div className="flex flex-col gap-1">
                              <span className="line-clamp-1">
                                {product.name}
                              </span>
                              {product.variants.length > 0 && (
                                <span className="text-[9px] sm:text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border w-fit">
                                  {product.variants.length} variações
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-muted-foreground text-xs sm:text-sm align-middle hidden md:table-cell">
                            {product.category?.name || "Sem Categoria"}
                          </TableCell>

                          <TableCell className="align-middle hidden lg:table-cell">
                            <span
                              className={`text-xs sm:text-sm font-medium ${
                                totalStock === 0
                                  ? "text-red-500"
                                  : "text-foreground"
                              }`}
                            >
                              {totalStock} un
                            </span>
                          </TableCell>

                          <TableCell className="align-middle">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                                product.status === "active"
                                  ? "bg-green-50 text-green-700"
                                  : product.status === "inactive"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {product.status === "active"
                                ? "Ativo"
                                : product.status === "inactive"
                                  ? "Inativo"
                                  : "Arquivado"}
                            </span>
                          </TableCell>

                          <TableCell className="text-foreground font-medium text-xs sm:text-sm align-middle hidden sm:table-cell">
                            {formatCurrency(product.basePrice)}
                          </TableCell>

                          <TableCell className="text-muted-foreground text-xs sm:text-sm align-middle hidden lg:table-cell">
                            {product.costPrice != null
                              ? formatCurrency(product.costPrice)
                              : "—"}
                          </TableCell>

                          <TableCell className="text-xs sm:text-sm align-middle hidden xl:table-cell">
                            {product.costPrice != null ? (
                              <span className="text-green-700 font-medium">
                                {formatCurrency(
                                  product.basePrice - product.costPrice
                                )}{" "}
                                <span className="text-muted-foreground font-normal">
                                  (
                                  {product.basePrice > 0
                                    ? (
                                        ((product.basePrice -
                                          product.costPrice) /
                                          product.basePrice) *
                                        100
                                      ).toFixed(0)
                                    : 0}
                                  %)
                                </span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell className="align-middle">
                            <ProductRowActions
                              id={product.id}
                              status={product.status}
                              name={product.name}
                              basePrice={product.basePrice}
                              costPrice={product.costPrice}
                              sku={product.sku}
                              categoryId={product.categoryId}
                              description={product.description}
                              imageUrl={product.imageUrl}
                              images={product.images}
                              inventory={product.inventory}
                              variants={product.variants}
                              ncm={product.ncm}
                              origin={product.origin}
                              cfop={product.cfop}
                              cest={product.cest}
                              organizationId={organizationId}
                              options={options}
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
