"use server";

import { db } from "@/db";
import { inventory, products, stores } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";

export type ExchangeOrReturnType = "exchange" | "return";

/**
 * Transfere quantidade de um produto/variante de uma loja para outra.
 */
export async function transferStock(
  productId: string,
  variantId: string | null,
  fromStoreId: string,
  toStoreId: string,
  quantity: number,
) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const qty = Math.floor(Number(quantity));
  if (qty <= 0) return { error: "Quantidade deve ser maior que zero." };
  if (fromStoreId === toStoreId)
    return { error: "Selecione uma loja de destino diferente da origem." };

  try {
    const orgId = session.organizationId;

    const [product] = await db
      .select({ id: products.id, organizationId: products.organizationId })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, orgId),
        ),
      )
      .limit(1);
    if (!product) return { error: "Produto não encontrado." };

    const whereOrigin = variantId
      ? and(
          eq(inventory.storeId, fromStoreId),
          eq(inventory.variantId, variantId),
        )
      : and(
          eq(inventory.storeId, fromStoreId),
          eq(inventory.productId, productId),
          isNull(inventory.variantId),
        );

    const [originRow] = await db
      .select({ id: inventory.id, quantity: inventory.quantity })
      .from(inventory)
      .where(whereOrigin)
      .limit(1);

    if (!originRow) return { error: "Estoque de origem não encontrado." };
    const currentQty = originRow.quantity ?? 0;
    if (currentQty < qty)
      return {
        error: `Estoque insuficiente na loja de origem. Disponível: ${currentQty}.`,
      };

    const [fromStore, toStore] = await Promise.all([
      db
        .select({ id: stores.id })
        .from(stores)
        .where(
          and(eq(stores.id, fromStoreId), eq(stores.organizationId, orgId)),
        )
        .limit(1),
      db
        .select({ id: stores.id })
        .from(stores)
        .where(
          and(eq(stores.id, toStoreId), eq(stores.organizationId, orgId)),
        )
        .limit(1),
    ]);
    if (!fromStore[0] || !toStore[0])
      return { error: "Loja de origem ou destino inválida." };

    await db.transaction(async (tx) => {
      await tx
        .update(inventory)
        .set({
          quantity: currentQty - qty,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, originRow.id));

      const whereDest = variantId
        ? and(
            eq(inventory.storeId, toStoreId),
            eq(inventory.variantId, variantId),
          )
        : and(
            eq(inventory.storeId, toStoreId),
            eq(inventory.productId, productId),
            isNull(inventory.variantId),
          );

      const [destRow] = await tx
        .select({ id: inventory.id, quantity: inventory.quantity })
        .from(inventory)
        .where(whereDest)
        .limit(1);

      if (destRow) {
        await tx
          .update(inventory)
          .set({
            quantity: (destRow.quantity ?? 0) + qty,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, destRow.id));
      } else {
        await tx.insert(inventory).values({
          storeId: toStoreId,
          productId: productId,
          variantId: variantId,
          quantity: qty,
          minStock: 5,
        });
      }
    });

    revalidatePath("/inventory/products");
    revalidatePath("/pos");
    revalidatePath("/dashboard");
    return { success: true, message: "Transferência realizada com sucesso!" };
  } catch (err) {
    console.error("Erro ao transferir estoque:", err);
    return { error: "Erro ao transferir. Tente novamente." };
  }
}

/**
 * Registra saída de estoque por troca (produto que o cliente leva).
 */
export async function registerExchangeOrReturn(
  storeId: string,
  productId: string,
  variantId: string | null,
  quantity: number,
  type: ExchangeOrReturnType,
) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };
  if (type === "return") {
    return { error: "Use registerReturnAddStock para devolução (entrada no estoque)." };
  }

  const qty = Math.floor(Number(quantity));
  if (qty <= 0) return { error: "Quantidade deve ser maior que zero." };

  try {
    const orgId = session.organizationId;

    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(eq(stores.id, storeId), eq(stores.organizationId, orgId)),
      )
      .limit(1);
    if (!store) return { error: "Loja inválida." };

    const whereInv = variantId
      ? and(
          eq(inventory.storeId, storeId),
          eq(inventory.variantId, variantId),
        )
      : and(
          eq(inventory.storeId, storeId),
          eq(inventory.productId, productId),
          isNull(inventory.variantId),
        );

    const [inv] = await db
      .select({ id: inventory.id, quantity: inventory.quantity })
      .from(inventory)
      .where(whereInv)
      .limit(1);

    if (!inv) return { error: "Estoque não encontrado para esta loja." };
    const current = inv.quantity ?? 0;
    if (current < qty)
      return {
        error: `Estoque insuficiente. Disponível: ${current}.`,
      };

    await db
      .update(inventory)
      .set({
        quantity: current - qty,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, inv.id));

    revalidatePath("/inventory/products");
    revalidatePath("/pos");
    revalidatePath("/dashboard");
    return { success: true, message: "Troca registrada com sucesso!" };
  } catch (err) {
    console.error("Erro ao registrar saída:", err);
    return { error: "Erro ao registrar. Tente novamente." };
  }
}

/**
 * Registra devolução: cliente devolve produto → entrada no estoque (qualquer produto).
 * Cria linha de estoque se não existir.
 */
export async function registerReturnAddStock(
  storeId: string,
  productId: string,
  variantId: string | null,
  quantity: number,
) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const qty = Math.floor(Number(quantity));
  if (qty <= 0) return { error: "Quantidade deve ser maior que zero." };

  try {
    const orgId = session.organizationId;

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, orgId),
        ),
      )
      .limit(1);
    if (!product) return { error: "Produto não encontrado." };

    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(eq(stores.id, storeId), eq(stores.organizationId, orgId)),
      )
      .limit(1);
    if (!store) return { error: "Loja inválida." };

    const whereInv = variantId
      ? and(
          eq(inventory.storeId, storeId),
          eq(inventory.variantId, variantId),
        )
      : and(
          eq(inventory.storeId, storeId),
          eq(inventory.productId, productId),
          isNull(inventory.variantId),
        );

    const [inv] = await db
      .select({ id: inventory.id, quantity: inventory.quantity })
      .from(inventory)
      .where(whereInv)
      .limit(1);

    if (inv) {
      const current = inv.quantity ?? 0;
      await db
        .update(inventory)
        .set({
          quantity: current + qty,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inv.id));
    } else {
      await db.insert(inventory).values({
        storeId,
        productId,
        variantId,
        quantity: qty,
        minStock: 5,
      });
    }

    revalidatePath("/inventory/products");
    revalidatePath("/pos");
    revalidatePath("/dashboard");
    return { success: true, message: "Devolução registrada com sucesso! Estoque atualizado." };
  } catch (err) {
    console.error("Erro ao registrar devolução:", err);
    return { error: "Erro ao registrar. Tente novamente." };
  }
}

export type AddIncomingEntry = { storeId: string; quantity: number };

/**
 * Adiciona novas peças ao estoque do produto (entrada de mercadoria).
 * Soma as quantidades informadas por loja ao estoque já existente.
 * Cria linha de estoque se não existir na loja.
 */
export async function addIncomingStock(
  productId: string,
  variantId: string | null,
  entries: AddIncomingEntry[],
) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const validEntries = entries
    .map((e) => ({ storeId: e.storeId, quantity: Math.floor(Number(e.quantity)) }))
    .filter((e) => e.quantity > 0);
  if (validEntries.length === 0)
    return { error: "Informe ao menos uma loja com quantidade maior que zero." };

  try {
    const orgId = session.organizationId;

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.organizationId, orgId),
        ),
      )
      .limit(1);
    if (!product) return { error: "Produto não encontrado." };

    await db.transaction(async (tx) => {
      for (const { storeId, quantity: qty } of validEntries) {
        const [store] = await tx
          .select({ id: stores.id })
          .from(stores)
          .where(
            and(eq(stores.id, storeId), eq(stores.organizationId, orgId)),
          )
          .limit(1);
        if (!store) continue;

        const whereInv = variantId
          ? and(
              eq(inventory.storeId, storeId),
              eq(inventory.variantId, variantId),
            )
          : and(
              eq(inventory.storeId, storeId),
              eq(inventory.productId, productId),
              isNull(inventory.variantId),
            );

        const [inv] = await tx
          .select({ id: inventory.id, quantity: inventory.quantity })
          .from(inventory)
          .where(whereInv)
          .limit(1);

        if (inv) {
          const current = inv.quantity ?? 0;
          await tx
            .update(inventory)
            .set({
              quantity: current + qty,
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, inv.id));
        } else {
          await tx.insert(inventory).values({
            storeId,
            productId,
            variantId,
            quantity: qty,
            minStock: 5,
          });
        }
      }
    });

    revalidatePath("/inventory/products");
    revalidatePath("/pos");
    revalidatePath("/dashboard");
    return { success: true, message: "Novas peças adicionadas ao estoque com sucesso!" };
  } catch (err) {
    console.error("Erro ao adicionar novas peças:", err);
    return { error: "Erro ao atualizar estoque. Tente novamente." };
  }
}
