// src/actions/auth.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erro de Login:", error.message);

    return {
      error: "E-mail ou senha incorretos. Verifique suas credenciais.",
    };
  }

  revalidatePath("/", "layout");

  return { success: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");

  redirect("/login");
}
