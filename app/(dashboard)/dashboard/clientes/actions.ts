"use server";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { clientSchema } from "@/lib/validations/client";
import { eq, and, or, ne } from "drizzle-orm";

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
export async function updateClientAction(
  formData: FormData,
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "Usuário não autenticado" };

  const clientId = formData.get("id") as string;
  if (!clientId)
    return { success: false, message: "ID do cliente não fornecido" };

  const rawDocument = (formData.get("document") as string) || "";
  const rawPhone = (formData.get("phone") as string) || "";
  const cleanDocument = rawDocument.replace(/\D/g, "");
  const cleanPhone = rawPhone.replace(/\D/g, "");

  const rawData = {
    name: formData.get("name"),
    type: formData.get("type"),
    document: cleanDocument,
    email: (formData.get("email") as string) || "",
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
        ne(clients.id, clientId),
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
      if (existingClient.document === validatedData.document)
        return {
          success: false,
          message: "CPF/CNPJ já cadastrado em outro cliente.",
        };
      if (validatedData.email && existingClient.email === validatedData.email)
        return {
          success: false,
          message: "E-mail já em uso por outro cliente.",
        };
      if (validatedData.phone && existingClient.phone === validatedData.phone)
        return {
          success: false,
          message: "Telefone já em uso por outro cliente.",
        };
    }

    await db
      .update(clients)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)));

    revalidatePath("/dashboard/clientes");
    return { success: true, message: "Cliente atualizado com sucesso!" };
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return { success: false, message: "Erro interno ao atualizar cliente." };
  }
}

export async function deleteClientAction(
  clientId: string,
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "Usuário não autenticado" };

  try {
    await db
      .delete(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)));

    revalidatePath("/dashboard/clientes");
    return { success: true, message: "Cliente removido com sucesso." };
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return { success: false, message: "Erro ao excluir cliente." };
  }
}
