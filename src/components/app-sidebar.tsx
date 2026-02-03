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

interface AppSidebarProps {
  user: Readonly<{
    name: string;
    email: string;
    initials: string;
  }>;
  logo: React.ReactNode;
}

export function AppSidebar({ user, logo }: Readonly<AppSidebarProps>) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={toggleMenu}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white shadow-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X size={24} className="text-slate-600" />
        ) : (
          <Menu size={24} className="text-slate-600" />
        )}
      </button>

      {isOpen && (
        <button
          className="fixed inset-0 bg-slate-900/50 md:hidden z-40 backdrop-blur-sm transition-opacity"
          onClick={closeMenu}
          aria-label="Close menu"
          type="button"
        />
      )}

      <aside
        className={`fixed md:static top-0 left-0 h-screen md:h-auto w-72 md:w-64 border-r border-slate-200 flex flex-col bg-white z-50 transition-transform duration-300 ease-in-out shadow-xl md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 md:p-6 flex flex-col h-full">
          <div className="mt-14 md:mt-0 mb-2">{logo}</div>

          <nav className="flex-1 space-y-1 mt-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">
              Menu Principal
            </p>

            <Link
              href="/dashboard"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                pathname === "/dashboard"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard
                size={18}
                className={
                  pathname === "/dashboard"
                    ? "text-slate-200"
                    : "text-slate-400"
                }
              />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/inventory/products"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                isActive("/inventory/products")
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Package
                size={18}
                className={
                  isActive("/inventory/products")
                    ? "text-slate-200"
                    : "text-slate-400"
                }
              />
              <span>Produtos</span>
            </Link>

            <Link
              href="/crm"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                isActive("/crm")
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Users
                size={18}
                className={
                  isActive("/crm") ? "text-slate-200" : "text-slate-400"
                }
              />
              <span>Clientes</span>
            </Link>
            <Link
              href="/team"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                isActive("/team")
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Users2
                size={18}
                className={
                  isActive("/team") ? "text-slate-200" : "text-slate-400"
                }
              />
              <span>Time</span>
            </Link>

            <Link
              href="/settings"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                isActive("/settings")
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Settings
                size={18}
                className={
                  isActive("/settings") ? "text-slate-200" : "text-slate-400"
                }
              />
              <span>Configurações</span>
            </Link>
          </nav>

          <div className="border-t border-slate-100 pt-4 mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-slate-50 transition-all outline-none group cursor-pointer border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 min-w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm text-sm">
                      {user.initials}
                    </div>
                    <div className="flex flex-col text-left truncate">
                      <span className="text-xs font-bold text-slate-900 leading-none truncate mb-1">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <MoreVertical
                    size={16}
                    className="text-slate-400 group-hover:text-slate-600 transition-colors"
                  />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                side="right"
                className="w-56 mb-2 shadow-xl border-slate-200 rounded-xl"
              >
                <DropdownMenuLabel className="text-slate-500 font-semibold text-[10px] uppercase tracking-widest">
                  Minha Conta
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />

                <form action={logout}>
                  <button type="submit" className="w-full">
                    <DropdownMenuItem className="gap-2 py-2.5 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-medium rounded-lg m-1">
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
