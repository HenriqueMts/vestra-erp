"use server";

import { db } from "@/db";
import {
  sales,
  saleItems,
  inventory,
  clients,
  stores,
  cashClosures,
  profiles,
} from "@/db/schema";
import { eq, and, isNull, gte, lte, sql, desc } from "drizzle-orm";
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
    // Verificar se o caixa está fechado
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const [existingClosure] = await db
      .select({ id: cashClosures.id })
      .from(cashClosures)
      .where(
        and(
          eq(cashClosures.organizationId, session.organizationId),
          eq(cashClosures.storeId, storeId),
          gte(cashClosures.periodStart, startOfDay),
          lte(cashClosures.periodStart, endOfDay),
        ),
      )
      .limit(1);

    if (existingClosure) {
      return { error: "O caixa do dia já foi fechado. Reabra o caixa para realizar novas vendas." };
    }

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

export async function closeDailyCash(storeId?: string | null) {
  const session = await getUserSession();

  if (!["owner", "manager"].includes(session.role)) {
    return { error: "Apenas dono ou gerente podem fechar o caixa." };
  }

  const effectiveStoreId = storeId || session.storeId;

  if (!effectiveStoreId) {
    return { error: "Nenhuma loja selecionada para fechamento de caixa." };
  }

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  // Verifica se já existe fechamento para hoje nessa loja
  const [existingClosure] = await db
    .select({ id: cashClosures.id })
    .from(cashClosures)
    .where(
      and(
        eq(cashClosures.organizationId, session.organizationId),
        eq(cashClosures.storeId, effectiveStoreId),
        gte(cashClosures.periodStart, startOfDay),
        lte(cashClosures.periodStart, endOfDay),
      ),
    )
    .limit(1);

  if (existingClosure) {
    return { error: "O caixa de hoje já foi fechado para esta loja." };
  }

  const [aggregates] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
      salesCount: sql<number>`count(*)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, session.organizationId),
        eq(sales.storeId, effectiveStoreId),
        gte(sales.createdAt, startOfDay),
        lte(sales.createdAt, endOfDay),
      ),
    );

  const totalCents = Number(aggregates?.totalCents ?? 0);
  const salesCount = Number(aggregates?.salesCount ?? 0);

  const [closure] = await db
    .insert(cashClosures)
    .values({
      organizationId: session.organizationId,
      storeId: effectiveStoreId,
      closedBy: session.user.id,
      totalCents,
      salesCount,
      periodStart: startOfDay,
      periodEnd: endOfDay,
    })
    .returning({
      id: cashClosures.id,
    });

  revalidatePath("/dashboard");
  revalidatePath("/pos");

  return {
    success: true,
    closureId: closure.id,
    totalCents,
    salesCount,
  };
}

export async function getDailySales(storeId?: string | null) {
  const session = await getUserSession();

  if (!["owner", "manager"].includes(session.role)) {
    return { error: "Apenas dono ou gerente podem visualizar as vendas do dia." };
  }

  const effectiveStoreId = storeId || session.storeId;

  if (!effectiveStoreId) {
    return { error: "Nenhuma loja selecionada." };
  }

  // Criar datas do início e fim do dia em hora local
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Verifica se já existe fechamento para hoje
  const [existingClosure] = await db
    .select({ id: cashClosures.id })
    .from(cashClosures)
    .where(
      and(
        eq(cashClosures.organizationId, session.organizationId),
        eq(cashClosures.storeId, effectiveStoreId),
        gte(cashClosures.periodStart, startOfDay),
        lte(cashClosures.periodStart, endOfDay),
      ),
    )
    .limit(1);

  // Busca todas as vendas do dia usando query builder padrão (mais confiável)
  const whereConditions = and(
    eq(sales.organizationId, session.organizationId),
    eq(sales.storeId, effectiveStoreId),
    gte(sales.createdAt, startOfDay),
    lte(sales.createdAt, endOfDay),
  );

  const dailySalesData = await db
    .select({
      id: sales.id,
      totalCents: sales.totalCents,
      paymentMethod: sales.paymentMethod,
      createdAt: sales.createdAt,
      sellerId: sales.sellerId,
      clientId: sales.clientId,
    })
    .from(sales)
    .where(whereConditions)
    .orderBy(desc(sales.createdAt));

  // Buscar relações separadamente
  const dailySales = await Promise.all(
    dailySalesData.map(async (sale) => {
      const seller = await db.query.profiles.findFirst({
        where: eq(profiles.id, sale.sellerId),
        columns: {
          id: true,
          name: true,
          email: true,
        },
      });

      const client = sale.clientId
        ? await db.query.clients.findFirst({
            where: eq(clients.id, sale.clientId),
            columns: {
              id: true,
              name: true,
            },
          })
        : null;

      const items = await db.query.saleItems.findMany({
        where: eq(saleItems.saleId, sale.id),
        with: {
          product: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        ...sale,
        seller,
        client,
        items,
      };
    }),
  );

  const [aggregates] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
      salesCount: sql<number>`count(*)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, session.organizationId),
        eq(sales.storeId, effectiveStoreId),
        gte(sales.createdAt, startOfDay),
        lte(sales.createdAt, endOfDay),
      ),
    );

  return {
    success: true,
    sales: dailySales,
    totalCents: Number(aggregates?.totalCents ?? 0),
    salesCount: Number(aggregates?.salesCount ?? 0),
    isClosed: !!existingClosure,
    closureId: existingClosure?.id || null,
  };
}

export async function reopenCash(closureId: string) {
  const session = await getUserSession();

  if (!["owner", "manager"].includes(session.role)) {
    return { error: "Apenas dono ou gerente podem reabrir o caixa." };
  }

  // Verifica se o fechamento pertence à organização do usuário
  const [closure] = await db
    .select({ id: cashClosures.id })
    .from(cashClosures)
    .where(
      and(
        eq(cashClosures.id, closureId),
        eq(cashClosures.organizationId, session.organizationId),
      ),
    )
    .limit(1);

  if (!closure) {
    return { error: "Fechamento de caixa não encontrado." };
  }

  // Deleta o fechamento
  await db.delete(cashClosures).where(eq(cashClosures.id, closureId));

  revalidatePath("/dashboard");
  revalidatePath("/pos");
  revalidatePath("/dashboard/cash-closure");

  return { success: true };
}
