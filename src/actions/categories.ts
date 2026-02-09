"use server";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const categorySchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
});

export async function createCategory(data: z.infer<typeof categorySchema>) {
  const { organizationId } = await getUserSession();
  if (!organizationId) return { error: "Não autorizado" };

  const slug = slugify(data.name);
  if (!slug) return { error: "Nome inválido para gerar slug." };

  try {
    await db.insert(categories).values({
      organizationId,
      name: data.name.trim(),
      slug,
    });
    revalidatePath("/settings");
    revalidatePath("/settings/categories");
    revalidatePath("/inventory/products");
    return { success: true, message: "Categoria adicionada!" };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { error: "Já existe uma categoria com este nome." };
    }
    return { error: "Erro ao criar categoria." };
  }
}

export async function updateCategory(
  id: string,
  data: z.infer<typeof categorySchema>
) {
  const { organizationId } = await getUserSession();
  if (!organizationId) return { error: "Não autorizado" };

  const slug = slugify(data.name);
  if (!slug) return { error: "Nome inválido para gerar slug." };

  try {
    await db
      .update(categories)
      .set({ name: data.name.trim(), slug })
      .where(
        and(
          eq(categories.id, id),
          eq(categories.organizationId, organizationId)
        )
      );
    revalidatePath("/settings");
    revalidatePath("/settings/categories");
    revalidatePath("/inventory/products");
    return { success: true, message: "Categoria atualizada!" };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { error: "Já existe uma categoria com este nome." };
    }
    return { error: "Erro ao atualizar categoria." };
  }
}

export async function deleteCategory(id: string) {
  const { organizationId } = await getUserSession();
  if (!organizationId) return { error: "Não autorizado" };

  try {
    await db
      .delete(categories)
      .where(
        and(
          eq(categories.id, id),
          eq(categories.organizationId, organizationId)
        )
      );
    revalidatePath("/settings");
    revalidatePath("/settings/categories");
    revalidatePath("/inventory/products");
    return { success: true, message: "Categoria removida." };
  } catch {
    return {
      error: "Não foi possível remover. Verifique se há produtos vinculados.",
    };
  }
}

export async function getCategories() {
  const { organizationId } = await getUserSession();
  if (!organizationId) return { categories: [] };

  const list = await db.query.categories.findMany({
    where: eq(categories.organizationId, organizationId),
    columns: { id: true, name: true, slug: true },
    orderBy: [asc(categories.name)],
  });
  return { categories: list };
}
