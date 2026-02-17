import { AppSidebar } from "@/components/app-sidebar";
import { OrganizationLogo } from "@/components/organization-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UpdateNotesModal } from "@/components/update-notes-modal";
import { getUserSession } from "@/lib/get-user-session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getUserSession();

  if (!session) {
    redirect("/login");
  }
  if (session.mustChangePassword) {
    redirect("/update-password");
  }

  const displayName =
    session.profile?.name ||
    session.user.user_metadata?.name ||
    session.user.email?.split("@")[0] ||
    "Usuário";

  const userInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "US";

  const userData = {
    name: displayName,
    email: session.user.email || "",
    initials: userInitials,
    role: session.role,
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-end border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} logo={<OrganizationLogo />} />
        <UpdateNotesModal />
        <main className="flex-1 overflow-y-auto w-full">{children}</main>
      </div>
    </div>
  );
}
