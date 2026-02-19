import { AppSidebar } from "@/components/app-sidebar";
import { OrganizationLogo } from "@/components/organization-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UpdateNotesModal } from "@/components/update-notes-modal";
import { getUserSessionSafe } from "@/lib/get-user-session-safe";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = isPlatformAdmin(user.email || "");

  // Se for admin, permitir acesso mesmo sem organização
  let session = null;
  let profile = null;
  
  if (isAdmin) {
    // Para admin, buscar apenas o perfil se existir
    try {
      profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
      });
    } catch {
      profile = null;
    }

    if (profile?.mustChangePassword) {
      redirect("/update-password");
    }
  } else {
    // Para usuários normais, usar getUserSessionSafe que não redireciona
    session = await getUserSessionSafe();
    
    if (!session) {
      redirect("/login?error=no_org");
    }
    
    if (session.mustChangePassword) {
      redirect("/update-password");
    }
    
    // Bloquear acesso se billingStatus = suspended (exceto em /minha-conta)
    if (session.billingStatus === "suspended") {
      redirect("/minha-conta?blocked=suspended");
    }
  }

  const displayName =
    session?.profile?.name ||
    profile?.name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuário";

  const userInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "US";

  const userData = {
    name: displayName,
    email: user.email || "",
    initials: userInitials,
    role: session?.role,
    isAdmin,
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-start border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} logo={<OrganizationLogo />} />
        <UpdateNotesModal />
        <main className="flex-1 overflow-y-auto w-full min-w-0">{children}</main>
      </div>
    </div>
  );
}
