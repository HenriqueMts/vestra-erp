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

  const userInitials = session.user.email
    ? session.user.email.substring(0, 2).toUpperCase()
    : "US";

  const userData = {
    name: session.user.user_metadata?.name || "Usuário",
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
