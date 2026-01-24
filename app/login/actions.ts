"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erro ao entrar:", error.message);

    return redirect(
      `/login?error=${encodeURIComponent("Credenciais inválidas.")}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error("Erro no Auth:", authError.message);
    return redirect(`/login?error=${encodeURIComponent(authError.message)}`);
  }

  if (authData.user) {
    try {
      await db.insert(profiles).values({
        id: authData.user.id,
        name: name,
        email: email,
      });
    } catch (dbError) {
      console.error("Erro ao criar perfil:", dbError);
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?message=Conta criada com sucesso! Bem-vindo.");
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");

  redirect("/login");
}
