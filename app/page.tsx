import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const supabase = await createClient();

  // Verifica a sessão do usuário no servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Lógica de Redirecionamento
  if (user) {
    // Se já está logado, vai direto pro trabalho
    redirect("/dashboard");
  } else {
    // Se não, vai para a tela de login
    redirect("/login");
  }
}
