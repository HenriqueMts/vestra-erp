import { createClient } from "@/utils/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";

/**
 * Verifica se o usuário tem acesso a áreas de owner/manager.
 * Admin sempre tem acesso.
 */
export async function canAccessOwnerManager(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return false;
  }

  // Admin sempre tem acesso
  if (isPlatformAdmin(user.email)) {
    return true;
  }

  // Para usuários normais, precisa verificar role via getUserSession
  // Mas essa função não deve ser chamada diretamente aqui para evitar loops
  // Retorna false e deixa a página específica verificar
  return false;
}

/**
 * Verifica se o usuário é admin da plataforma
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return false;
  }

  return isPlatformAdmin(user.email);
}
