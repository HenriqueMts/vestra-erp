import { AppSidebar } from "@/components/app-sidebar";
import { OrganizationLogo } from "@/components/organization-logo";
import { getUserSession } from "@/lib/get-user-session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <AppSidebar user={userData} logo={<OrganizationLogo />} />

      <main className="flex-1 overflow-y-auto w-full">{children}</main>
    </div>
  );
}
