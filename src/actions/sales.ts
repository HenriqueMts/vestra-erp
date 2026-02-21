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
  products,
  organizations,
  productVariants,
  colors,
  sizes,
} from "@/db/schema";
import { emitInvoice } from "@/actions/invoice";
import { eq, and, isNull, gte, lte, sql, desc } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { getStartOfDayBrazil, getEndOfDayBrazil } from "@/lib/day-in-brazil";
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
  clientId: string | null,
  interestRateBps?: number | null,
  surchargeCents?: number | null,
  isEcommerce?: boolean,
) {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  if (items.length === 0) return { error: "Nenhum item na venda." };

  const baseTotalCents = items.reduce(
    (acc, i) => acc + i.quantity * i.unitPriceCents,
    0,
  );

  const rawInterestRateBps =
    typeof interestRateBps === "number" ? Math.trunc(interestRateBps) : 0;

  if (!Number.isFinite(rawInterestRateBps)) {
    return { error: "Percentual de juros inválido." };
  }

  const effectiveInterestRateBps =
    paymentMethod === "credit" ? rawInterestRateBps : 0;

  if (effectiveInterestRateBps < 0 || effectiveInterestRateBps > 10_000) {
    return { error: "Percentual de juros inválido (0% a 100%)." };
  }

  const interestCents = Math.round(
    (baseTotalCents * effectiveInterestRateBps) / 10_000,
  );

  const extraCents = surchargeCents && surchargeCents > 0 ? surchargeCents : 0;

  const totalCents = baseTotalCents + interestCents + extraCents;

  try {
    const startOfDay = getStartOfDayBrazil();
    const endOfDay = getEndOfDayBrazil();

    // Se não for ecommerce, verifica se o caixa está fechado
    if (!isEcommerce) {
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
        return {
          error:
            "O caixa do dia já foi fechado. Reabra o caixa para realizar novas vendas.",
        };
      }
    }

    // Validar loja e cliente (se informado)
    const [store] = await db
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.organizationId, session.organizationId),
        ),
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
            eq(clients.organizationId, session.organizationId),
          ),
        )
        .limit(1);
      if (!client) return { error: "Cliente inválido." };
    }

    let saleId: string | undefined;

    await db.transaction(async (tx) => {
      // Buscar estoque com select explícito (por store + variantId ou productId sem variante)
      const updates: { inventoryId: string; quantity: number }[] = [];

      for (const item of items) {
        const whereCondition = item.variantId
          ? and(
              eq(inventory.storeId, storeId),
              eq(inventory.variantId, item.variantId),
            )
          : and(
              eq(inventory.storeId, storeId),
              eq(inventory.productId, item.productId),
              isNull(inventory.variantId),
            );

        const [inv] = await tx
          .select({
            id: inventory.id,
            quantity: inventory.quantity,
          })
          .from(inventory)
          .where(whereCondition)
          .limit(1);

        if (!inv) {
          throw new Error("Estoque não encontrado para um dos itens.");
        }
        const currentQty = inv.quantity ?? 0;
        if (currentQty < item.quantity) {
          throw new Error(
            `Estoque insuficiente. Disponível: ${currentQty}, solicitado: ${item.quantity}.`,
          );
        }
        updates.push({
          inventoryId: inv.id,
          quantity: item.quantity,
        });
      }

      const [sale] = await tx
        .insert(sales)
        .values({
          organizationId: session.organizationId,
          storeId,
          clientId: clientId || null,
          sellerId: session.user.id,
          paymentMethod,
          totalCents,
          channel: isEcommerce ? "ecommerce" : "store",
          surchargeCents: extraCents,
        })
        .returning({ id: sales.id });

      if (!sale) throw new Error("Erro ao criar venda.");
      saleId = sale.id;

      await tx.insert(saleItems).values(
        items.map((i) => ({
          saleId: sale.id,
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
        })),
      );

      // Decrementar estoque de forma atômica (evita condição de corrida)
      for (const u of updates) {
        await tx
          .update(inventory)
          .set({
            quantity: sql`${inventory.quantity} - ${u.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, u.inventoryId));
      }
    });

    revalidatePath("/pos");
    revalidatePath("/inventory/products");
    revalidatePath("/dashboard");

    let invoiceUrl: string | undefined;
    try {
      const emitResult = await emitInvoice(saleId!);
      if ("url" in emitResult && emitResult.url) {
        invoiceUrl = emitResult.url;
      }
    } catch (emitErr) {
      console.error("Emissão NFC-e falhou (venda registrada):", emitErr);
      // Não falha a venda: cupom não fiscal segue para impressão
    }

    return {
      success: true,
      saleId: saleId!,
      message: "Venda concluída!",
      invoiceUrl,
    };
  } catch (err) {
    console.error("Erro ao finalizar venda:", err);
    const message =
      err instanceof Error ? err.message : "Erro ao processar venda. Tente novamente.";
    return { error: message };
  }
}

export type SaleReceiptData = {
  organization: { name: string; document?: string | null };
  store: { name: string };
  items: { name: string; quantity: number; price: number; total: number }[];
  total: number;
  date: Date;
  orderId: string;
  /** URL do DANFE quando a venda teve NFC-e emitida */
  invoiceUrl?: string | null;
};

export async function getSaleForReceipt(
  saleId: string
): Promise<{ error: string } | { data: SaleReceiptData }> {
  const session = await getUserSession();
  if (!session?.user?.id) return { error: "Não autorizado" };

  const [sale] = await db
    .select({
      id: sales.id,
      totalCents: sales.totalCents,
      createdAt: sales.createdAt,
      storeId: sales.storeId,
      organizationId: sales.organizationId,
      invoiceUrl: sales.invoiceUrl,
    })
    .from(sales)
    .where(
      and(
        eq(sales.id, saleId),
        eq(sales.organizationId, session.organizationId)
      )
    )
    .limit(1);

  if (!sale) return { error: "Venda não encontrada." };

  const [org] = await db
    .select({
      name: organizations.name,
      document: organizations.document,
    })
    .from(organizations)
    .where(eq(organizations.id, sale.organizationId))
    .limit(1);

  const [store] = await db
    .select({ name: stores.name })
    .from(stores)
    .where(eq(stores.id, sale.storeId))
    .limit(1);

  const rows = await db
    .select({
      productName: products.name,
      quantity: saleItems.quantity,
      unitPriceCents: saleItems.unitPriceCents,
      colorName: colors.name,
      sizeName: sizes.name,
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .leftJoin(productVariants, eq(saleItems.variantId, productVariants.id))
    .leftJoin(colors, eq(productVariants.colorId, colors.id))
    .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
    .where(eq(saleItems.saleId, saleId));

  const items = rows.map((r) => {
    const priceReais = r.unitPriceCents / 100;
    const totalReais = priceReais * r.quantity;
    const details = [r.colorName, r.sizeName].filter(Boolean).join(" / ");
    const name =
      details.length > 0
        ? `${r.productName} (${details})`
        : r.productName;
    return {
      name,
      quantity: r.quantity,
      price: priceReais,
      total: totalReais,
    };
  });

  const totalReais = sale.totalCents / 100;

  return {
    data: {
      organization: {
        name: org?.name ?? "Empresa",
        document: org?.document ?? null,
      },
      store: { name: store?.name ?? "Loja" },
      items,
      total: totalReais,
      date: sale.createdAt ?? new Date(),
      orderId: sale.id,
      invoiceUrl: sale.invoiceUrl ?? null,
    },
  };
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

  const startOfDay = getStartOfDayBrazil();
  const endOfDay = getEndOfDayBrazil();

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
        eq(sales.channel, "store"),
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
    return {
      error: "Apenas dono ou gerente podem visualizar as vendas do dia.",
    };
  }

  const effectiveStoreId = storeId || session.storeId;

  if (!effectiveStoreId) {
    return { error: "Nenhuma loja selecionada." };
  }

  // Dia atual no fuso de São Paulo (evita diferença localhost vs produção em UTC)
  const startOfDay = getStartOfDayBrazil();
  const endOfDay = getEndOfDayBrazil();

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
        ? (await db.query.clients.findFirst({
            where: eq(clients.id, sale.clientId),
            columns: {
              id: true,
              name: true,
            },
          })) ?? null
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
        seller: seller ?? null,
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
        eq(sales.channel, "store"),
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

/** Dados do relatório de fechamento para impressão */
export type CashClosureReportSale = {
  id: string;
  totalCents: number;
  paymentMethod: string;
  createdAt: Date | null;
  seller: { name: string } | null;
  client: { name: string } | null;
  items: Array<{
    quantity: number;
    unitPriceCents: number;
    productName: string;
  }>;
};

export async function getCashClosureReport(closureId: string) {
  const session = await getUserSession();

  if (!["owner", "manager"].includes(session.role)) {
    return { error: "Apenas dono ou gerente podem visualizar o relatório." };
  }

  const [closure] = await db
    .select()
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

  const [storeRow] = await db
    .select({ name: stores.name })
    .from(stores)
    .where(eq(stores.id, closure.storeId))
    .limit(1);

  const [orgRow] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, closure.organizationId))
    .limit(1);

  const closedByProfile = await db.query.profiles.findFirst({
    where: eq(profiles.id, closure.closedBy),
    columns: { name: true },
  });

  const salesData = await db
    .select({
      id: sales.id,
      totalCents: sales.totalCents,
      paymentMethod: sales.paymentMethod,
      createdAt: sales.createdAt,
      sellerId: sales.sellerId,
      clientId: sales.clientId,
    })
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, closure.organizationId),
        eq(sales.storeId, closure.storeId),
        gte(sales.createdAt, closure.periodStart),
        lte(sales.createdAt, closure.periodEnd),
      ),
    )
    .orderBy(desc(sales.createdAt));

  const reportSales: CashClosureReportSale[] = await Promise.all(
    salesData.map(async (sale) => {
      const seller = await db.query.profiles.findFirst({
        where: eq(profiles.id, sale.sellerId),
        columns: { name: true },
      });
      const client = sale.clientId
        ? await db.query.clients.findFirst({
            where: eq(clients.id, sale.clientId),
            columns: { name: true },
          })
        : null;
      const items = await db.query.saleItems.findMany({
        where: eq(saleItems.saleId, sale.id),
        with: {
          product: { columns: { name: true } },
        },
      });
      return {
        id: sale.id,
        totalCents: sale.totalCents,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        seller: seller ? { name: seller.name } : null,
        client: client ? { name: client.name } : null,
        items: items.map((i) => ({
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          productName: i.product?.name ?? "Produto",
        })),
      };
    }),
  );

  return {
    success: true,
    data: {
      closure: {
        id: closure.id,
        totalCents: closure.totalCents,
        salesCount: closure.salesCount,
        periodStart: closure.periodStart,
        periodEnd: closure.periodEnd,
        createdAt: closure.createdAt,
      },
      storeName: storeRow?.name ?? "Loja",
      orgName: orgRow?.name ?? "Organização",
      closedByName: closedByProfile?.name ?? "—",
      sales: reportSales,
    },
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
