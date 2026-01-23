import { LayoutDashboard, Users, LogOut, Settings } from "lucide-react";
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
            href="/dashboard/clientes"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
          >
            <Users size={20} />
            Clientes
          </Link>
        </nav>

        {/* Perfil no Rodapé da Sidebar */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
              J
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Jilem</span>
              <span className="text-xs text-slate-400">loja@jilem.com</span>
            </div>
          </div>
          <button className="flex items-center gap-3 px-3 py-2 w-full text-slate-500 hover:text-red-600 transition-colors">
            <LogOut size={18} />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto bg-slate-50/30 p-8">
        {children}
      </main>
    </div>
  );
}
