"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { revalidatePath } from "next/cache";

export async function uploadLogo(formData: FormData) {
  const { organizationId, user } = await getUserSession();

  if (!user || !organizationId) {
    return { error: "Usuário não autenticado." };
  }

  // 2. Pega o arquivo do formulário
  const file = formData.get("file") as File;

  if (!file) {
    return { error: "Nenhum arquivo enviado." };
  }

  // Validação simples (Tamanho máx 2MB e tipo imagem)
  if (file.size > 2 * 1024 * 1024) {
    return { error: "A imagem deve ter no máximo 2MB." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Apenas arquivos de imagem são permitidos." };
  }

  const supabase = await createClient();

  // 3. Cria um nome único para o arquivo
  // Ex: jilem-modas-123456789.png
  const fileExt = file.name.split(".").pop();
  const fileName = `${organizationId}-${Date.now()}.${fileExt}`;

  // 4. Envia para o Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("logos") // Nome do bucket que criamos
    .upload(fileName, file, {
      upsert: true, // Substitui se já existir com mesmo nome
    });

  if (uploadError) {
    console.error("Erro no upload:", uploadError);
    return { error: "Falha ao enviar imagem para o servidor." };
  }

  // 5. Pega a URL Pública
  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(fileName);

  // 6. Atualiza o Banco de Dados com a nova URL
  try {
    await db
      .update(organizations)
      .set({ logoUrl: publicUrl })
      .where(eq(organizations.id, organizationId));

    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return { success: true, url: publicUrl };
  } catch (dbError) {
    console.error("Erro no banco:", dbError);
    return { error: "Imagem enviada, mas falha ao salvar no banco." };
  }
}
