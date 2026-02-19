import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";

/**
 * Atualiza a URL do logo no banco após upload direto ao Supabase Storage.
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId, user } = await getUserSession();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName } = body as { fileName: string };

    if (!fileName) {
      return NextResponse.json({ error: "Nome do arquivo não fornecido" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(fileName);

    await db
      .update(organizations)
      .set({ logoUrl: publicUrl })
      .where(eq(organizations.id, organizationId));

    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Erro ao atualizar logo:", error);
    return NextResponse.json({ error: "Erro ao processar atualização" }, { status: 500 });
  }
}
