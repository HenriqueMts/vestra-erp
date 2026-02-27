// src/actions/auth.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Retorna se o usuário logado (cookies) deve ser redirecionado para criação de senha. Sem redirect. */
export async function checkNeedsPasswordChange(): Promise<{
  needsPasswordChange: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { needsPasswordChange: false };
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    columns: { mustChangePassword: true },
  });
  return {
    needsPasswordChange: profile?.mustChangePassword ?? false,
  };
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
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
