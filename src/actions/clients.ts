"use server";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUserSession } from "@/lib/get-user-session";
import { validateCPF, validateCNPJ } from "@/utils/validators";

/** Normaliza documento para apenas dígitos (busca no banco) */
function normalizeDocument(value: string): string {
  return value.replace(/\D/g, "");
}

interface ClientFormState {
  success?: boolean;
  errors?: {
    name?: string[];
    document?: string[];
    email?: string[];
  };
  message?: string;
  client?: {
    id: string;
    name: string;
    document: string;
    type: "PF" | "PJ";
    email: string | null;
    phone: string | null;
  };
}

export async function createClient(
  prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { organizationId, user } = await getUserSession();

  const name = formData.get("name") as string;
  const document = formData.get("document") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const type = formData.get("type") as "PF" | "PJ";

  if (!name || !document) {
    return { success: false, message: "Nome e Documento são obrigatórios." };
  }

  const isValidDocument =
    type === "PJ" ? validateCNPJ(document) : validateCPF(document);

  if (!isValidDocument) {
    return {
      success: false,
      message: `O ${type === "PJ" ? "CNPJ" : "CPF"} informado é inválido.`,
    };
  }

  try {
    const [created] = await db
      .insert(clients)
      .values({
        organizationId,
        createdBy: user.id,
        name,
        document,
        email: email || null,
        phone: phone || null,
        type,
      })
      .returning({
        id: clients.id,
        name: clients.name,
        document: clients.document,
        type: clients.type,
        email: clients.email,
        phone: clients.phone,
      });

    revalidatePath("/crm");
    return {
      success: true,
      message: "Cliente criado com sucesso!",
      client: created ?? undefined,
    };
  } catch (error) {
    console.error("Erro ao criar cliente:", error);

    if ((error as { code?: string }).code === "23505") {
      return {
        success: false,
        message: "Este CPF/CNPJ já está cadastrado nesta organização.",
      };
    }
    return { success: false, message: "Erro ao salvar no banco de dados." };
  }
}

export async function updateClient(
  prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { organizationId } = await getUserSession();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const document = formData.get("document") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const type = formData.get("type") as "PF" | "PJ";

  try {
    await db
      .update(clients)
      .set({
        name,
        document,
        email,
        phone,
        type,
      })
      .where(
        and(
          eq(clients.id, id),
          eq(clients.organizationId, organizationId), // Segurança SaaS
        ),
      );

    revalidatePath("/crm");
    return { success: true, message: "Cliente atualizado com sucesso!" };
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return { success: false, message: "Erro ao atualizar cliente." };
  }
}

export async function deleteClient(id: string) {
  try {
    const { organizationId } = await getUserSession();

    await db
      .delete(clients)
      .where(
        and(eq(clients.id, id), eq(clients.organizationId, organizationId)),
      );

    revalidatePath("/crm");

    return { success: true, message: "Cliente excluído com sucesso." };
  } catch (error) {
    console.error("Erro ao deletar", error);
    return { success: false, message: "Erro ao excluir cliente." };
  }
}

/** Busca cliente por CPF/CNPJ na organização (para POS). */
export async function findClientByDocument(document: string) {
  const { organizationId } = await getUserSession();
  if (!organizationId) return null;

  const normalized = normalizeDocument(document);
  if (normalized.length !== 11 && normalized.length !== 14) return null;

  const list = await db
    .select()
    .from(clients)
    .where(eq(clients.organizationId, organizationId));

  const client = list.find(
    (c) => normalizeDocument(c.document) === normalized
  );
  return client ?? null;
}
