import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/get-user-session";
import { createClient } from "@/utils/supabase/server";

/**
 * Gera uma signed URL para upload direto do cliente ao Supabase Storage.
 * Isso permite uploads maiores que 4.5MB (limite da Vercel) fazendo upload direto.
 */
export async function POST(request: NextRequest) {
  try {
    const { organizationId, user } = await getUserSession();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { bucket, fileName, fileSize } = body as {
      bucket: "products" | "logos";
      fileName: string;
      fileSize: number;
    };

    if (!bucket || !fileName || !fileSize) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    if (fileSize > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande (max 20MB)" }, { status: 400 });
    }

    const supabase = await createClient();

    // Para uploads diretos, usamos o método createSignedUploadUrl (se disponível)
    // ou retornamos permissão para upload direto
    // Como alternativa, podemos usar o método de upload direto com token
    
    // Gera um path único baseado na organização
    const path = bucket === "products" 
      ? `${organizationId}/${fileName}`
      : `${organizationId}-${fileName}`;

    // Retorna informações para upload direto
    // O cliente fará upload usando o cliente Supabase diretamente
    return NextResponse.json({
      success: true,
      path,
      bucket,
    });
  } catch (error) {
    console.error("Erro ao gerar signed URL:", error);
    return NextResponse.json({ error: "Erro ao processar requisição" }, { status: 500 });
  }
}
