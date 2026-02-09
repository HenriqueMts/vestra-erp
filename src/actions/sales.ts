"use server";

import { db } from "@/db";
import {
  sales,
  saleItems,
  inventory,
  clients,
  stores,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";

export type PaymentMethod = "pix" | "credit" | "debit" | "cash";

export interface SaleItemInput {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPriceCents: number;
}

export async function completeSale(
  storeId: string,
  paymentMethod: PaymentMethod,
  items: SaleItemInput[],
  clientId: string | null
) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  if (items.length === 0) return { error: "Nenhum item na venda." };

  const totalCents = items.reduce(
    (acc, i) => acc + i.quantity * i.unitPriceCents,
    0
  );

  try {
    // Validar estoque e obter IDs de inventory para decrementar
    const updates: { inventoryId: string; quantity: number; currentQty: number }[] = [];

    for (const item of items) {
      const inv = await db.query.inventory.findFirst({
        where: item.variantId
          ? and(
              eq(inventory.storeId, storeId),
              eq(inventory.variantId, item.variantId)
            )
          : and(
              eq(inventory.storeId, storeId),
              eq(inventory.productId, item.productId),
              isNull(inventory.variantId)
            ),
      });

      if (!inv) {
        return { error: `Estoque não encontrado para um dos itens.` };
      }
      const currentQty = inv.quantity ?? 0;
      if (currentQty < item.quantity) {
        return {
          error: `Estoque insuficiente para "${item.productId}". Disponível: ${currentQty}, solicitado: ${item.quantity}.`,
        };
      }
      updates.push({
        inventoryId: inv.id,
        quantity: item.quantity,
        currentQty,
      });
    }

    // Validar loja e cliente (se informado)
    const [store] = await db
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.organizationId, session.organizationId)
        )
      )
      .limit(1);
    if (!store) return { error: "Loja inválida." };

    if (clientId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.organizationId, session.organizationId)
          )
        )
        .limit(1);
      if (!client) return { error: "Cliente inválido." };
    }

    const [sale] = await db
      .insert(sales)
      .values({
        organizationId: session.organizationId,
        storeId,
        clientId: clientId || null,
        sellerId: session.user.id,
        paymentMethod,
        totalCents,
      })
      .returning({ id: sales.id });

    if (!sale) return { error: "Erro ao criar venda." };

    await db.insert(saleItems).values(
      items.map((i) => ({
        saleId: sale.id,
        productId: i.productId,
        variantId: i.variantId || null,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
      }))
    );

    for (const u of updates) {
      await db
        .update(inventory)
        .set({ quantity: u.currentQty - u.quantity })
        .where(eq(inventory.id, u.inventoryId));
    }

    revalidatePath("/pos");
    return { success: true, saleId: sale.id, message: "Venda concluída!" };
  } catch (err) {
    console.error("Erro ao finalizar venda:", err);
    return { error: "Erro ao processar venda. Tente novamente." };
  }
}
