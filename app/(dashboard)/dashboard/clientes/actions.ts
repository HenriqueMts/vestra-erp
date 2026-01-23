"use server";

import { db } from "@/db";
import { clients } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const document = formData.get("document") as string;

  await db.insert(clients).values({
    name,
    email,
    phone,
    document,
    userId: user.id,
  });

  revalidatePath("/dashboard/clientes");
}
