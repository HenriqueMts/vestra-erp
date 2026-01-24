"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  LogOut,
  MoreVertical,
  Menu,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "../../app/login/actions";

interface AppSidebarProps {
  user: Readonly<{
    name: string;
    email: string;
    initials: string;
  }>;
}

export function AppSidebar({ user }: Readonly<AppSidebarProps>) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={toggleMenu}
        className="md:hidden fixed top-4 right-4 z-50 p-2 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <button
          className="fixed inset-0 bg-black/50 md:hidden z-40"
          onClick={closeMenu}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeMenu();
          }}
          aria-label="Close menu"
          type="button"
        />
      )}

      <aside
        className={`fixed md:static top-0 left-0 h-screen md:h-auto w-64 border-b md:border-r border-slate-100 flex flex-col p-4 md:p-6 space-y-6 md:space-y-8 bg-white z-40 transition-transform duration-300 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } md:translate-x-0 md:w-64 md:relative md:z-10 md:border-b md:border-slate-100`}
      >
        <div className="flex items-center justify-between md:justify-start gap-3 px-2 mt-12 md:mt-0">
          <Image src="/jilem-logo.svg" alt="Logo" width={32} height={32} />
          <span className="hidden md:inline font-bold text-lg tracking-tight">
            Jilem Modas
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-4">
            Menu Principal
          </p>

          <Link
            href="/dashboard"
            onClick={closeMenu}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all cursor-pointer ${
              isActive("/dashboard")
                ? "bg-slate-50 text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard
              size={20}
              className={
                isActive("/dashboard") ? "text-slate-900" : "text-slate-400"
              }
            />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/dashboard/clientes"
            onClick={closeMenu}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all cursor-pointer ${
              isActive("/dashboard/clientes")
                ? "bg-slate-50 text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Users
              size={20}
              className={
                isActive("/dashboard/clientes")
                  ? "text-slate-900"
                  : "text-slate-400"
              }
            />
            <span>Clientes</span>
          </Link>
        </nav>

        <div className="border-t border-slate-100 pt-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-slate-50 transition-all outline-none group cursor-pointer">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 min-w-10 rounded-xl bg-slate-900 flex items-center justify-center font-bold text-white shadow-sm">
                    {user.initials}
                  </div>
                  <div className="flex flex-col text-left truncate">
                    <span className="text-sm font-bold text-slate-900 leading-none truncate">
                      {user.name}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 truncate">
                      {user.email}
                    </span>
                  </div>
                </div>
                <MoreVertical
                  size={18}
                  className="text-slate-400 group-hover:text-slate-600 transition-colors"
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              side="right"
              className="w-52 md:w-56 mb-2 shadow-2xl border-slate-200"
            >
              <DropdownMenuLabel className="text-slate-500 font-semibold text-xs uppercase tracking-widest">
                Minha Conta
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />

              <DropdownMenuSeparator className="bg-slate-100" />

              <form action={logout}>
                <button type="submit" className="w-full text-left cursor-pointer">
                  <DropdownMenuItem className="gap-2 py-3 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-medium">
                    <LogOut size={16} />
                    Sair
                  </DropdownMenuItem>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
