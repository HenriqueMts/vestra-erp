"use server";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { clientSchema } from "@/lib/validations/client";
import { eq, and, or } from "drizzle-orm";

export type ActionResponse = {
  success: boolean;
  message: string;
};

export async function createClientAction(
  formData: FormData,
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Usuário não autenticado" };
  }

  // 1. Limpeza
  const rawDocument = (formData.get("document") as string) || "";
  const rawPhone = (formData.get("phone") as string) || "";
  const email = (formData.get("email") as string) || "";

  const cleanDocument = rawDocument.replace(/\D/g, "");
  const cleanPhone = rawPhone.replace(/\D/g, "");

  const rawData = {
    name: formData.get("name"),
    type: formData.get("type"),
    document: cleanDocument,
    email: email,
    phone: cleanPhone,
  };

  const validationResult = clientSchema.safeParse(rawData);
  if (!validationResult.success) {
    return {
      success: false,
      message: validationResult.error.issues[0].message,
    };
  }

  const validatedData = validationResult.data;

  try {
    const existingClient = await db.query.clients.findFirst({
      where: and(
        eq(clients.userId, user.id),
        or(
          eq(clients.document, validatedData.document),
          validatedData.email
            ? eq(clients.email, validatedData.email)
            : undefined,
          validatedData.phone
            ? eq(clients.phone, validatedData.phone)
            : undefined,
        ),
      ),
    });

    if (existingClient) {
      if (existingClient.document === validatedData.document) {
        return {
          success: false,
          message: `O CPF/CNPJ ${rawDocument} já está cadastrado.`,
        };
      }
      if (validatedData.email && existingClient.email === validatedData.email) {
        return {
          success: false,
          message: `O e-mail ${validatedData.email} já está em uso.`,
        };
      }
      if (validatedData.phone && existingClient.phone === validatedData.phone) {
        return {
          success: false,
          message: `O telefone ${rawPhone} já está em uso.`,
        };
      }
    }

    await db.insert(clients).values({
      ...validatedData,
      userId: user.id,
    });

    revalidatePath("/dashboard/clientes");

    return { success: true, message: "Cliente cadastrado com sucesso!" };
  } catch (error) {
    console.error("Erro interno:", error);

    return {
      success: false,
      message: "Erro interno no servidor. Tente novamente.",
    };
  }
}
