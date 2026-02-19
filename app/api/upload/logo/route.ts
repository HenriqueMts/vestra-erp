import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { organizationId, user } = await getUserSession();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "A imagem deve ter no máximo 20MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!file.type.startsWith("image/") && ext !== "img") {
      return NextResponse.json({ error: "Apenas arquivos de imagem são permitidos" }, { status: 400 });
    }

    const supabase = await createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${organizationId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error("Erro no upload:", uploadError);
      return NextResponse.json({ error: "Falha ao enviar imagem para o servidor" }, { status: 500 });
    }

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
    console.error("Erro no upload:", error);
    return NextResponse.json({ error: "Erro ao processar upload" }, { status: 500 });
  }
}
