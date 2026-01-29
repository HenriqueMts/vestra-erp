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

  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=auth_code_error`,
  );
}
