import { db } from "@/db";
import { products, inventory, stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { POSInterface } from "@/components/pos-interface";

// Sempre usar loja do cookie e estoque atualizado (troca de loja + após venda)
export const dynamic = "force-dynamic";

export default async function POSPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const storeIdCookie = cookieStore.get("vestra_pos_store");

  // Cookie da loja selecionada ou loja principal (defaultStoreId) do usuário
  const activeStoreId = storeIdCookie?.value || session.storeId;

  if (!activeStoreId) {
    redirect("/pos/select-store");
  }

  const currentStore = await db.query.stores.findFirst({
    where: eq(stores.id, activeStoreId),
    with: {
      organization: true,
    },
  });

  if (!currentStore) redirect("/pos/select-store");

  const catalog = await db.query.products.findMany({
    where: eq(products.organizationId, session.organizationId),
    with: {
      category: true,
      images: true,
      variants: {
        with: {
          color: true,
          size: true,
          inventory: {
            where: eq(inventory.storeId, activeStoreId),
          },
        },
      },
      inventory: {
        where: eq(inventory.storeId, activeStoreId),
      },
    },
  });

  const serializedProducts = catalog
    .filter((p) => p.status === "active")
    .map((p) => {
      // Produto com variantes: soma só o estoque das variantes (já filtrado pela loja atual).
      // Produto sem variantes: usa o estoque direto do produto.
      const totalStock =
        p.variants.length > 0
          ? p.variants.reduce(
              (acc, v) =>
                acc +
                v.inventory.reduce((s, inv) => s + (inv.quantity ?? 0), 0),
              0,
            )
          : p.inventory.reduce((s, inv) => s + (inv.quantity ?? 0), 0);
      return {
        ...p,
        basePrice: Number(p.basePrice),
        totalStock,
        variants: p.variants.map((v) => ({
          ...v,
          size: v.size
            ? { name: v.size.name, order: v.size.order ?? undefined }
            : null,
        })),
      };
    });

  const canSwitchStore = session.role === "owner" || session.role === "manager";
  const availableStores = canSwitchStore
    ? await db.query.stores.findMany({
        where: eq(stores.organizationId, session.organizationId),
        columns: { id: true, name: true },
      })
    : [];

  return (
    <POSInterface
      store={currentStore}
      organization={currentStore.organization}
      products={serializedProducts}
      availableStores={availableStores}
      canSwitchStore={canSwitchStore}
    />
  );
}
