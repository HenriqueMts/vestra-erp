import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/get-user-session";

/**
 * Retorna o organizationId do usuário logado para permitir upload direto ao Supabase.
 */
export async function GET() {
  try {
    const { organizationId, user } = await getUserSession();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json({ organizationId });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao obter organização" }, { status: 500 });
  }
}
