import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // Sem code: fluxo invite/magic link envia tokens no hash (não suporta PKCE).
  // O hash não chega ao servidor; o cliente trata em /login (ver login/page.tsx).
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=auth_code_error`,
  );
}
