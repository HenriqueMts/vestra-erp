import { createBrowserClient, createServerClient } from "@supabase/ssr";

/**
 * Cria cliente Supabase para o servidor (Next.js com cookies) ou fallback
 * para ambiente estático/Tauri onde cookies() não existe.
 * No desktop (Tauri/static export) usa createBrowserClient para compatibilidade.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Em build estático ou Tauri não há request/response com cookies
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();

    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignorar em ambiente estático
          }
        },
      },
    });
  } catch {
    // Fallback: ambiente estático (output: 'export') ou Tauri desktop.
    // Usar cliente browser-compatível; em runtime no app será usado localStorage.
    if (typeof globalThis.window !== "undefined") {
      return createBrowserClient(url, key);
    }
    // Durante build (Node): cliente sem sessão para não quebrar a renderização
    return createServerClient(url, key, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    });
  }
}
