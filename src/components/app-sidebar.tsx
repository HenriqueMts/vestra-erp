"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  LogOut,
  MoreVertical,
  Menu,
  X,
  Settings,
  Users2,
  Package,
  LineChart,
  CreditCard,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/actions/auth";

type Role = "owner" | "manager" | "seller";

interface AppSidebarProps {
  user: Readonly<{
    name: string;
    email: string;
    initials: string;
    role?: Role;
    isAdmin?: boolean;
  }>;
  logo: React.ReactNode;
}

export function AppSidebar({ user, logo }: Readonly<AppSidebarProps>) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const canSeeSales =
    user.isAdmin || user.role === "owner" || user.role === "manager";

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={toggleMenu}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-sidebar shadow-sm border border-sidebar-border rounded-lg hover:bg-sidebar-accent transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X size={24} className="text-sidebar-foreground" />
        ) : (
          <Menu size={24} className="text-sidebar-foreground" />
        )}
      </button>

      {isOpen && (
        <button
          className="fixed inset-0 bg-black/50 dark:bg-black/60 md:hidden z-40 backdrop-blur-sm transition-opacity"
          onClick={closeMenu}
          aria-label="Close menu"
          type="button"
        />
      )}

      <aside
        className={`fixed md:static top-0 left-0 h-screen md:h-auto w-72 md:w-64 border-r border-sidebar-border flex flex-col bg-sidebar z-50 transition-transform duration-300 ease-in-out shadow-xl md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 md:p-6 flex flex-col h-full">
          <div className="mt-14 md:mt-0 mb-2">{logo}</div>

          <nav className="flex-1 space-y-1 mt-6">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-3">
              Menu Principal
            </p>

            <Link
              href="/dashboard"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                pathname === "/dashboard"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <LayoutDashboard
                size={18}
                className={
                  pathname === "/dashboard"
                    ? "text-sidebar-primary-foreground"
                    : "text-muted-foreground"
                }
              />
              <span>Dashboard</span>
            </Link>

            {canSeeSales && (
              <Link
                href="/dashboard/sales"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  isActive("/dashboard/sales")
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <LineChart
                  size={18}
                  className={
                    isActive("/dashboard/sales")
                      ? "text-sidebar-primary-foreground"
                      : "text-muted-foreground"
                  }
                />
                <span>Resumo de Vendas</span>
              </Link>
            )}

            <Link
              href="/inventory/products"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                isActive("/inventory/products")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Package
                size={18}
                className={
                  isActive("/inventory/products")
                    ? "text-sidebar-primary-foreground"
                    : "text-muted-foreground"
                }
              />
              <span>Produtos</span>
            </Link>

            <Link
              href="/crm"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                isActive("/crm")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Users
                size={18}
                className={
                  isActive("/crm")
                    ? "text-sidebar-primary-foreground"
                    : "text-muted-foreground"
                }
              />
              <span>Clientes</span>
            </Link>
            {canSeeSales && (
              <>
                <Link
                  href="/team"
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    isActive("/team")
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Users2
                    size={18}
                    className={
                      isActive("/team")
                        ? "text-sidebar-primary-foreground"
                        : "text-muted-foreground"
                    }
                  />
                  <span>Time</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    isActive("/settings")
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Settings
                    size={18}
                    className={
                      isActive("/settings")
                        ? "text-sidebar-primary-foreground"
                        : "text-muted-foreground"
                    }
                  />
                  <span>Configurações</span>
                </Link>

                {!user.isAdmin && (
                  <Link
                    href="/minha-conta"
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      isActive("/minha-conta")
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <CreditCard
                      size={18}
                      className={
                        isActive("/minha-conta")
                          ? "text-sidebar-primary-foreground"
                          : "text-muted-foreground"
                      }
                    />
                    <span>Plano de assinatura</span>
                  </Link>
                )}
              </>
            )}

            {user.isAdmin && (
              <>
                <div className="border-t border-sidebar-border my-2" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-3">
                  Administração
                </p>
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    isActive("/dashboard/admin")
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Shield
                    size={18}
                    className={
                      isActive("/dashboard/admin")
                        ? "text-sidebar-primary-foreground"
                        : "text-muted-foreground"
                    }
                  />
                  <span>Área Admin</span>
                </Link>
              </>
            )}
          </nav>

          <div className="border-t border-sidebar-border pt-4 mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-sidebar-accent transition-all outline-none group cursor-pointer border border-transparent hover:border-sidebar-border">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 min-w-9 rounded-lg bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground shadow-sm text-sm">
                      {user.initials}
                    </div>
                    <div className="flex flex-col text-left truncate">
                      <span className="text-xs font-bold text-sidebar-foreground leading-none truncate mb-1">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <MoreVertical
                    size={16}
                    className="text-muted-foreground group-hover:text-sidebar-foreground transition-colors"
                  />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side="right"
                className="w-56 mb-2 shadow-xl border-border rounded-xl bg-popover text-popover-foreground"
              >
                <DropdownMenuLabel className="text-muted-foreground font-semibold text-[10px] uppercase tracking-widest">
                  Minha Conta
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />

                <form action={logout}>
                  <button type="submit" className="w-full">
                    <DropdownMenuItem className="gap-2 py-2.5 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive font-medium rounded-lg m-1">
                      <LogOut size={16} />
                      Sair do Sistema
                    </DropdownMenuItem>
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
}
