"use server";

import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUserSession } from "@/lib/get-user-session";
import { z } from "zod";

// Schema simplificado
const storeSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  address: z.string().optional(),
});

type StoreInput = z.infer<typeof storeSchema>;

export async function createStore(data: StoreInput) {
  const { user, organizationId } = await getUserSession();

  if (!user || !organizationId) {
    return { error: "Não autorizado" };
  }

  try {
    await db.insert(stores).values({
      organizationId,
      name: data.name,
      address: data.address,
      // Phone removido
    });

    revalidatePath("/settings");
    return { success: true, message: "Nova loja criada com sucesso!" };
  } catch (error) {
    console.error(error);
    return { error: "Erro ao criar loja." };
  }
}

export async function deleteStore(storeId: string) {
  const { user, organizationId } = await getUserSession();

  if (!user || !organizationId) return { error: "Não autorizado" };

  try {
    const [storeToDelete] = await db
      .select()
      .from(stores)
      .where(
        and(eq(stores.id, storeId), eq(stores.organizationId, organizationId)),
      )
      .limit(1);

    if (!storeToDelete) return { error: "Loja não encontrada." };

    await db.delete(stores).where(eq(stores.id, storeId));

    revalidatePath("/settings");
    return { success: true, message: "Loja removida." };
  } catch (error) {
    console.error(error);
    return {
      error: "Erro ao remover loja. Verifique se há estoque vinculado.",
    };
  }
}
