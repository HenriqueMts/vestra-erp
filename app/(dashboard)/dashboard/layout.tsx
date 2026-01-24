import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar"; // Importe o componente novo

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Busca os dados do perfil no banco (onde está o Nome da Loja)
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  // Prepara os dados para o componente visual
  // Fallback: Se não tiver nome no banco, usa a primeira parte do email
  const userName = profile?.name || user.email?.split("@")[0] || "Minha Loja";
  const userEmail = user.email || "sem-email";

  // Lógica para pegar as iniciais (Ex: Jilem Modas -> JM)
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const userData = {
    name: userName,
    email: userEmail,
    initials: initials,
  };

  return (
    <div className="flex h-screen bg-white text-slate-900">
      {/* Passamos os dados reais para a Sidebar */}
      <AppSidebar user={userData} />

      {/* ml-64 empurra o conteúdo para a direita, já que a sidebar agora é 'fixed' */}
      <main className="flex-1 overflow-y-auto bg-slate-50/30 p-8 ml-64">
        {children}
      </main>
    </div>
  );
}
