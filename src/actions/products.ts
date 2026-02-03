"use server";

import { db } from "@/db";
import {
  products,
  productImages,
  inventory,
  stores,
  categories,
} from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUserSession } from "@/lib/get-user-session";
import { getCurrentOrg } from "@/utils/auth";
import { z } from "zod";

// 1. Atualizamos o Schema do Zod para incluir 'status'
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  categoryId: z.string().min(1),
  price: z.number(),
  description: z.string().optional(),
  // Novo campo status (enum)
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  quantity: z.number().int().default(0),
  images: z.array(z.string()).default([]),
});

type ProductInput = z.infer<typeof productSchema>;

export async function saveProduct(data: ProductInput, organizationId: string) {
  const { user } = await getUserSession();
  if (!user) return { error: "Não autorizado" };

  try {
    const priceInCents = Math.round(data.price * 100);

    const coverImage = data.images.length > 0 ? data.images[0] : null;
    const galleryImages = data.images.length > 1 ? data.images.slice(1) : [];

    let productId = data.id;

    if (productId) {
      // --- EDIÇÃO ---
      await db
        .update(products)
        .set({
          name: data.name,
          categoryId: data.categoryId,
          basePrice: priceInCents,
          description: data.description,
          imageUrl: coverImage,
          status: data.status, // <--- Atualiza o Status
        })
        .where(eq(products.id, productId));
    } else {
      // --- CRIAÇÃO ---
      const sku = `PROD-${Date.now()}`;

      const [newProduct] = await db
        .insert(products)
        .values({
          organizationId,
          name: data.name,
          sku,
          basePrice: priceInCents,
          categoryId: data.categoryId,
          description: data.description,
          imageUrl: coverImage,
          status: data.status, // <--- Salva o Status
        })
        .returning({ id: products.id });

      productId = newProduct.id;

      const [mainStore] = await db
        .select()
        .from(stores)
        .where(eq(stores.organizationId, organizationId))
        .orderBy(asc(stores.createdAt))
        .limit(1);

      if (mainStore && data.quantity > 0) {
        await db.insert(inventory).values({
          storeId: mainStore.id,
          productId: productId,
          quantity: data.quantity,
          minStock: 5,
        });
      }
    }

    if (productId) {
      await db
        .delete(productImages)
        .where(eq(productImages.productId, productId));

      if (galleryImages.length > 0) {
        const imageInserts = galleryImages.map((url, index) => ({
          productId: productId!,
          url,
          order: index,
        }));

        await db.insert(productImages).values(imageInserts);
      }
    }

    revalidatePath("/dashboard/products");
    return { success: true, message: "Produto salvo com sucesso!" };
  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    return { error: "Erro interno ao salvar." };
  }
}

// ... (mantenha deleteProduct e getProductOptions como estavam)
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

    await db.delete(products).where(eq(products.id, productId));

    revalidatePath("/dashboard/products");
    return { success: true, message: "Produto removido com sucesso." };
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
    return { error: "Erro interno ao tentar deletar o produto." };
  }
}

export async function getProductOptions() {
  const { organizationId } = await getCurrentOrg();

  if (!organizationId) {
    return { categories: [] };
  }

  const categoriesList = await db.query.categories.findMany({
    where: eq(categories.organizationId, organizationId),
    columns: {
      id: true,
      name: true,
    },
  });

  return {
    categories: categoriesList,
  };
}
