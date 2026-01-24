"use client"; // Adicionado para permitir interatividade (Dropdown)

import {
  LogOut,
  MoreVertical,
  User,
  Settings,
  LayoutDashboard, // Adicionado
  Users, // Adicionado
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "../../login/actions";
import Link from "next/link";
import Image from "next/image";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen bg-white text-slate-900">
      {/* Sidebar Lateral */}
      <aside className="w-64 border-r border-slate-100 flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <Image src="/jilem-logo.svg" alt="Logo" width={32} height={32} />
          <span className="font-bold text-lg tracking-tight">Jilem Modas</span>
        </div>

        <nav className="flex-1 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-4">
            Menu Principal
          </p>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 text-slate-900 font-medium transition-all"
          >
            <LayoutDashboard size={20} className="text-slate-500" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/clients"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
          >
            <Users size={20} />
            Clientes
          </Link>
        </nav>

        {/* Perfil no Rodapé da Sidebar */}
        <div className="border-t border-slate-100 pt-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-slate-50 transition-all outline-none group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200 shadow-sm">
                    JM
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold text-slate-900 leading-none">
                      Jilem Modas
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      admin@jilem.com
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

              <DropdownMenuItem className="gap-2 py-3 cursor-pointer text-slate-600 focus:bg-slate-50 focus:text-slate-900">
                <User size={16} />
                Perfil da Loja
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 py-3 cursor-pointer text-slate-600 focus:bg-slate-50 focus:text-slate-900">
                <Settings size={16} />
                Configurações
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-100" />

              <form action={logout}>
                <button type="submit" className="w-full text-left">
                  <DropdownMenuItem className="gap-2 py-3 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-medium">
                    <LogOut size={16} />
                    Sair do Sistema
                  </DropdownMenuItem>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50/30 p-8">
        {children}
      </main>
    </div>
  );
}
