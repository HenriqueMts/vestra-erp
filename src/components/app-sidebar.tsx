"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  LogOut,
  MoreVertical,
  User,
  Settings,
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
  user: {
    name: string;
    email: string;
    initials: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  // Função auxiliar para verificar link ativo
  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 border-r border-slate-100 flex flex-col p-6 space-y-8 bg-white fixed h-full z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2">
        <Image src="/jilem-logo.svg" alt="Logo" width={32} height={32} />
        <span className="font-bold text-lg tracking-tight">Jilem Modas</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-4">
          Menu Principal
        </p>

        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all ${
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
          Dashboard
        </Link>

        <Link
          href="/dashboard/clientes"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all ${
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
          Clientes
        </Link>
      </nav>

      {/* Perfil no Rodapé (DADOS REAIS AQUI) */}
      <div className="border-t border-slate-100 pt-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-slate-50 transition-all outline-none group">
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Avatar com Iniciais Reais */}
                <div className="w-10 h-10 min-w-[40px] rounded-xl bg-slate-900 flex items-center justify-center font-bold text-white shadow-sm">
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
            className="w-56 mb-2 shadow-2xl border-slate-200"
          >
            <DropdownMenuLabel className="text-slate-500 font-semibold text-xs uppercase tracking-widest">
              Minha Conta
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />

            <DropdownMenuSeparator className="bg-slate-100" />

            <form action={logout}>
              <button type="submit" className="w-full text-left">
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
  );
}
