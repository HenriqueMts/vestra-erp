import { UpdateNotesModal } from "@/components/update-notes-modal";
import { getUserSession } from "@/lib/get-user-session";
import { redirect } from "next/navigation";

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getUserSession();

  if (!session) {
    redirect("/login");
  }
  // Bloquear acesso se billingStatus = suspended
  if (session.billingStatus === "suspended") {
    redirect("/minha-conta?blocked=suspended");
  }

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-900 font-sans">
      <UpdateNotesModal />
      {/* Aqui futuramente podemos colocar um Header simplificado do POS (Status do Caixa, Usuário Logado) */}
      <main className="h-screen w-full flex flex-col">{children}</main>
    </div>
  );
}
