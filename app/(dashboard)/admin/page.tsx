import { createClient } from "@/utils/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { listAllOrganizations } from "@/actions/admin";
import { redirect } from "next/navigation";
import { AdminDashboardClient } from "./admin-dashboard-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Shield } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user?.email) {
    redirect("/login");
  }

  if (!isPlatformAdmin(user.email)) {
    redirect("/dashboard");
  }

  const result = await listAllOrganizations();
  
  if (result?.error) {
    return (
      <div className="w-full min-h-screen space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="rounded-lg bg-destructive/10 border border-destructive text-destructive p-4">
          {result.error}
        </div>
      </div>
    );
  }

  const organizations = result?.organizations ?? [];

  return (
    <div className="w-full min-h-screen space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 xl:p-10 bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-xl shadow-sm border border-primary/10">
            <Shield size={28} className="text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Área Administrativa
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium">
              Gerencie organizações, usuários e cobranças do Vestra ERP
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/50 backdrop-blur-sm w-full">
        <CardHeader className="pb-4 sm:pb-6 bg-gradient-to-r from-muted/50 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl shadow-sm border border-primary/10">
              <Building2 size={22} className="text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                Organizações
                <span className="text-base font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                  {organizations.length}
                </span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base font-medium">
                Todas as organizações cadastradas no sistema. Crie novas organizações e gerencie usuários.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 lg:px-8 py-6">
          <AdminDashboardClient organizations={organizations} />
        </CardContent>
      </Card>
    </div>
  );
}
