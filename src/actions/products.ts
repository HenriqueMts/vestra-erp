"use server";

import { db } from "@/db";
import {
  products,
  productImages,
  inventory,
  stores,
  categories,
  colors,
  sizes,
  productVariants,
  saleItems,
} from "@/db/schema";
import { eq, and, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUserSession } from "@/lib/get-user-session";
import { getCurrentOrg } from "@/utils/auth";
import {
  saveProductSchema,
  type SaveProductInput,
  type ProductOptions,
} from "@/types/product";

export async function getProductOptions(): Promise<ProductOptions> {
  const { organizationId } = await getCurrentOrg();

  if (!organizationId) {
    return { categories: [], stores: [], colors: [], sizes: [] };
  }

  const [cats, st, clr, sz] = await Promise.all([
    db.query.categories.findMany({
      where: eq(categories.organizationId, organizationId),
      columns: { id: true, name: true },
      orderBy: (categories, { asc }) => [asc(categories.name)],
    }),
    db.query.stores.findMany({
      where: eq(stores.organizationId, organizationId),
      columns: { id: true, name: true },
    }),
    db.query.colors.findMany({
      where: eq(colors.organizationId, organizationId),
      columns: { id: true, name: true, hex: true },
    }),
    db.query.sizes.findMany({
      where: eq(sizes.organizationId, organizationId),
      columns: { id: true, name: true },
      orderBy: (sizes, { asc }) => [asc(sizes.order)],
    }),
  ]);

  return {
    categories: cats,
    stores: st,
    colors: clr,
    sizes: sz,
  };
}

export async function saveProduct(
  data: SaveProductInput,
  organizationId: string,
) {
  const { user } = await getUserSession();
  if (!user) return { error: "Não autorizado" };

  const validation = saveProductSchema.safeParse(data);
  if (!validation.success) {
    const firstError = validation.error.issues?.[0];
    return { error: firstError?.message || "Dados inválidos" };
  }

  try {
    const priceInCents = Math.round(data.price * 100);
    const costPriceCents =
      data.costPrice !== undefined && data.costPrice !== null
        ? Math.round(Number(data.costPrice) * 100)
        : null;
    const coverImage = data.images.length > 0 ? data.images[0] : null;
    let productId = data.id;
    const isNewProduct = !data.id;

    const productSku = data.sku?.trim() || null;

    if (productId) {
      await db
        .update(products)
        .set({
          name: data.name,
          categoryId: data.categoryId,
          basePrice: priceInCents,
          costPrice: costPriceCents,
          description: data.description || null,
          imageUrl: coverImage,
          status: data.status,
          sku: productSku,
        })
        .where(eq(products.id, productId));
    } else {
      const [newProduct] = await db
        .insert(products)
        .values({
          organizationId,
          name: data.name,
          categoryId: data.categoryId,
          basePrice: priceInCents,
          costPrice: costPriceCents,
          description: data.description || null,
          imageUrl: coverImage,
          status: data.status,
          sku: productSku,
        })
        .returning({ id: products.id });

      productId = newProduct.id;
    }

    if (productId) {
      await db
        .delete(productImages)
        .where(eq(productImages.productId, productId));

      if (data.images.length > 0) {
        await db.insert(productImages).values(
          data.images.map((url, index) => ({
            productId: productId!,
            url,
            order: index,
          })),
        );
      }
    }

    if (data.hasVariants && data.variants.length > 0) {
      const submittedVariantIds = data.variants
        .map((v) => v.id)
        .filter((id): id is string => !!id);

      if (submittedVariantIds.length > 0) {
        await db
          .delete(productVariants)
          .where(
            and(
              eq(productVariants.productId, productId!),
              notInArray(productVariants.id, submittedVariantIds),
            ),
          );
      } else {
        await db
          .delete(productVariants)
          .where(eq(productVariants.productId, productId!));
      }

      await db.delete(inventory).where(eq(inventory.productId, productId!));

      const variantSku = productSku ?? "";

      for (const variant of data.variants) {
        // Só usar variant.id se for um UUID válido (não o id interno do useFieldArray)
        const rawId = variant.id;
        const isUuid =
          typeof rawId === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            rawId,
          );
        let variantId: string | undefined = isUuid ? rawId : undefined;

        // Variantes usam o SKU do produto (pai); só cor e tamanho são por variante
        if (!isNewProduct && variantId) {
          await db
            .update(productVariants)
            .set({
              sku: variantSku,
              colorId: variant.colorId || null,
              sizeId: variant.sizeId || null,
            })
            .where(eq(productVariants.id, variantId));
        } else {
          const [newVariant] = await db
            .insert(productVariants)
            .values({
              productId: productId!,
              sku: variantSku,
              colorId: variant.colorId || null,
              sizeId: variant.sizeId || null,
            })
            .returning({ id: productVariants.id });
          variantId = newVariant.id;
        }

        if (variant.inventory.length > 0) {
          await db.insert(inventory).values(
            variant.inventory.map((inv) => ({
              storeId: inv.storeId,
              productId: productId!,
              variantId: variantId!,
              quantity: Math.max(0, Number(inv.quantity) || 0),
              minStock: 5,
            })),
          );
        }
      }
    } else {
      await db
        .delete(productVariants)
        .where(eq(productVariants.productId, productId!));
      await db.delete(inventory).where(eq(inventory.productId, productId!));

      if (data.simpleInventory.length > 0) {
        await db.insert(inventory).values(
          data.simpleInventory.map((inv) => ({
            storeId: inv.storeId,
            productId: productId!,
            variantId: null,
            quantity: inv.quantity,
            minStock: 5,
          })),
        );
      }
    }

    revalidatePath("/inventory/products");
    return { success: true, message: "Produto salvo com sucesso!" };
  } catch (error: unknown) {
    console.error("Erro ao salvar produto:", error);

    const errorString = String(error);
    if (
      errorString.includes("unique_sku") ||
      errorString.includes("duplicate key")
    ) {
      return {
        error: "Já existe um produto ou variante com este SKU cadastrado.",
      };
    }

    return { error: "Erro interno ao salvar produto." };
  }
}

export async function deleteProduct(productId: string, organizationId: string) {
  const { user } = await getUserSession();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  try {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!product) {
      return { error: "Produto não encontrado ou sem permissão." };
    }

    const [salesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(saleItems)
      .where(eq(saleItems.productId, productId));

    if (Number(salesCount?.count ?? 0) > 0) {
      return {
        error:
          "Não é possível excluir produto que possui vendas vinculadas. Use a opção Arquivar no status do produto.",
      };
    }

    await db.delete(products).where(eq(products.id, productId));

    revalidatePath("/inventory/products");
    return { success: true, message: "Produto removido com sucesso." };
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
    return { error: "Erro interno ao tentar deletar o produto." };
  }
}

const LOW_STOCK_THRESHOLD = 5;

export type StockOverview = {
  totalProducts: number;
  totalUnits: number;
  lowStockCount: number;
};

export async function getStockOverview(): Promise<StockOverview | null> {
  const { organizationId } = await getCurrentOrg();
  if (!organizationId) return null;

  const [totalProductsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(
      and(
        eq(products.organizationId, organizationId),
        eq(products.status, "active"),
      ),
    );

  const [productUnitsRow] = await db
    .select({
      sum: sql<number>`coalesce(sum(${inventory.quantity}), 0)`,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .where(eq(products.organizationId, organizationId));

  const [variantUnitsRow] = await db
    .select({
      sum: sql<number>`coalesce(sum(${inventory.quantity}), 0)`,
    })
    .from(inventory)
    .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(products.organizationId, organizationId));

  const totalUnits =
    Number(productUnitsRow?.sum ?? 0) + Number(variantUnitsRow?.sum ?? 0);

  // Estoque baixo: soma por produto (inventory.productId inclui produto direto e variantes)
  // e conta quantos produtos têm total <= 5 (inclui zero = esgotado)
  const stockPerProduct = await db
    .select({
      productId: products.id,
      total: sql<number>`coalesce(sum(${inventory.quantity}), 0)`,
    })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(
      and(
        eq(products.organizationId, organizationId),
        eq(products.status, "active"),
      ),
    )
    .groupBy(products.id);

  const lowStockCount = stockPerProduct.filter(
    (row) => Number(row.total) <= LOW_STOCK_THRESHOLD,
  ).length;

  return {
    totalProducts: Number(totalProductsRow?.count ?? 0),
    totalUnits,
    lowStockCount,
  };
}
