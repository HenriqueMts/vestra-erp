import { getCategories } from "@/actions/categories";
import { CategoriesClient } from "@/components/categories-client";
import { getUserSession } from "@/lib/get-user-session";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");

  const canManage = ["owner", "manager"].includes(session.role);
  if (!canManage) redirect("/dashboard");

  const { categories } = await getCategories();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Categorias de Produto
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as categorias para organizar seus produtos (Camisa, Calça,
          Macacão, etc.).
        </p>
      </div>

      <CategoriesClient
        initialCategories={categories.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
      />
    </div>
  );
}
