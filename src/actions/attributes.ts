"use server";

import { db } from "@/db";
import { colors, sizes } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// --- CORES ---
const colorSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  hex: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Cor inválida"),
});

export async function createColor(data: z.infer<typeof colorSchema>) {
  const { organizationId } = await getUserSession();
  if (!organizationId) return { error: "Não autorizado" };

  try {
    await db.insert(colors).values({
      organizationId,
      name: data.name,
      hex: data.hex,
    });
    revalidatePath("/settings/attributes");
    return { success: true, message: "Cor adicionada!" };
  } catch (error) {
    return { error: "Erro ao criar cor." };
  }
}

export async function deleteColor(id: string) {
  const { organizationId } = await getUserSession();
  if (!organizationId) return { error: "Não autorizado" };

  try {
    await db
      .delete(colors)
      .where(and(eq(colors.id, id), eq(colors.organizationId, organizationId)));
    revalidatePath("/settings/attributes");
    return { success: true, message: "Cor removida." };
  } catch (error) {
    return { error: "Não foi possível remover. Verifique se está em uso." };
  }
}

// --- TAMANHOS ---
const sizeSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  order: z.coerce.number().default(0),
});

export async function createSize(data: z.infer<typeof sizeSchema>) {
  const { organizationId } = await getUserSession();
  if (!organizationId) return { error: "Não autorizado" };

  try {
    await db.insert(sizes).values({
      organizationId,
      name: data.name,
      order: data.order,
    });
    revalidatePath("/settings/attributes");
    return { success: true, message: "Tamanho adicionado!" };
  } catch (error) {
    return { error: "Erro ao criar tamanho." };
  }
}

export async function deleteSize(id: string) {
  const { organizationId } = await getUserSession();
  if (!organizationId) return { error: "Não autorizado" };

  try {
    await db
      .delete(sizes)
      .where(and(eq(sizes.id, id), eq(sizes.organizationId, organizationId)));
    revalidatePath("/settings/attributes");
    return { success: true, message: "Tamanho removido." };
  } catch (error) {
    return { error: "Não foi possível remover. Verifique se está em uso." };
  }
}

// Busca inicial
export async function getAttributes() {
  const { organizationId } = await getUserSession();
  if (!organizationId) return { colors: [], sizes: [] };

  const [colorsList, sizesList] = await Promise.all([
    db.query.colors.findMany({
      where: eq(colors.organizationId, organizationId),
    }),
    db.query.sizes.findMany({
      where: eq(sizes.organizationId, organizationId),
      orderBy: (sizes, { asc }) => [asc(sizes.order)],
    }),
  ]);

  return { colors: colorsList, sizes: sizesList };
}
