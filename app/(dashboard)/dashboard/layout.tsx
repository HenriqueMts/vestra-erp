import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  const userName = profile?.name || user.email?.split("@")[0] || "Minha Loja";
  const userEmail = user.email || "sem-email";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const userData = {
    name: userName,
    email: userEmail,
    initials: initials,
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 flex-col md:flex-row overflow-hidden">
      <AppSidebar user={userData} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/30 p-4 pt-16 md:p-8 md:pt-8 md:ml-64 w-full">
        {children}
      </main>
    </div>
  );
}
