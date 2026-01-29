"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserSession } from "@/lib/get-user-session";
import { redirect } from "next/navigation";

export async function updatePassword(formData: FormData) {
  const session = await getUserSession();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "As senhas não conferem." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter no mínimo 6 caracteres." };
  }

  const supabase = await createClient();

  // 1. Atualiza a senha no Supabase Auth
  const { error: authError } = await supabase.auth.updateUser({
    password: password,
  });

  if (authError) {
    console.error("Erro auth:", authError);
    return { error: "Erro ao definir senha. Tente uma senha mais forte." };
  }

  // 2. Remove a flag de obrigatoriedade no Banco
  await db
    .update(profiles)
    .set({ mustChangePassword: false })
    .where(eq(profiles.id, session.user.id));

  // 3. Redireciona para o Dashboard
  redirect("/dashboard");
}
