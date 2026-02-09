"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function selectStoreAction(storeId: string) {
  const cookieStore = await cookies();

  cookieStore.set("vestra_pos_store", storeId, {
    path: "/",
    maxAge: 60 * 60 * 24, // 1 dia
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/pos");
}
