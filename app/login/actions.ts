"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";

type ActionResponse = {
  success: boolean;
  message?: string;
};

export async function login(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erro ao entrar:", error.message);
    return { success: false, message: "Credenciais inválidas." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signup(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        name: formData.get("name") as string,
      },
    },
  };

  const { error: signUpError, data: signUpData } =
    await supabase.auth.signUp(data);

  if (signUpError) {
    return {
      success: false,
      message: "Erro ao criar conta: " + signUpError.message,
    };
  }

  try {
    if (signUpData.user) {
      await db.insert(profiles).values({
        id: signUpData.user.id,
        name: formData.get("name") as string,
        email: data.email,
      });
    }
  } catch (profileError) {
    console.error("Erro ao criar perfil:", profileError);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

import { redirect } from "next/navigation";
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
