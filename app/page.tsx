import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  Package,
  LayoutDashboard,
  Users,
  Store,
  CreditCard,
  BarChart3,
  Mail,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function MarketingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Usuário logado: redireciona direto para o PDV
  if (user) {
    redirect("/pos");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Package size={18} />
            </div>
            <span className="font-bold text-slate-900">Vestra</span>
          </div>
          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <LogIn size={16} />
              Já tem conta? Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-4 py-16 sm:py-24 md:py-32">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Sistema completo para gestão de sua loja Atacado ou Varejo
          </h1>
          <p className="mt-4 text-lg text-slate-600 sm:text-xl">
            Controle de estoque, vendas no PDV, clientes e equipe em uma única
            plataforma. Feito para Voce ir mais longe.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:henrique.mts@outlook.com.br?subject=Cotação Vestra ERP"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-slate-800"
            >
              <Mail size={18} />
              Solicitar cotação
            </a>
            <Link href="/login">
              <Button variant="outline" size="lg" className="gap-2">
                Acessar com minha conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-slate-200 px-4 py-16 sm:py-24">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Tudo que sua loja precisa
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Um ERP completo para moda, do cadastro de produtos ao fechamento de
            caixa.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Package,
                title: "Produtos e estoque",
                desc: "Cadastro com variantes (cor e tamanho), categorias, imagens e controle de estoque por loja.",
              },
              {
                icon: LayoutDashboard,
                title: "PDV integrado",
                desc: "Frente de caixa rápida para vendas presenciais. Busca por nome ou SKU, seleção de variantes e finalização com cliente.",
              },
              {
                icon: Users,
                title: "Cadastro de clientes",
                desc: "CPF/CNPJ, histórico e vínculo direto com as vendas realizadas.",
              },
              {
                icon: Store,
                title: "Multi-lojas",
                desc: "Gerencie várias unidades com estoque separado e troca de loja no PDV.",
              },
              {
                icon: CreditCard,
                title: "Formas de pagamento",
                desc: "Registro de vendas com PIX, crédito, débito e dinheiro.",
              },
              {
                icon: BarChart3,
                title: "Dashboard e relatórios",
                desc: "Visão geral de vendas, clientes e operação para tomada de decisão.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <item.icon size={24} />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Cotação */}
      <section className="border-b border-slate-200 bg-slate-900 px-4 py-16 sm:py-24">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Entre em contato para cotação
          </h2>
          <p className="mt-4 text-slate-300">
            Valores personalizados conforme o tamanho da sua operação. Fale
            conosco para uma proposta adequada à sua empresa.
          </p>
          <a
            href="mailto:henrique.mts@outlook.com.br?subject=Cotação Vestra ERP"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            <Mail size={18} />
            henrique.mts@outlook.com.br
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-4 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm text-slate-500">
            © Vestra ERP — Sistema de gestão para moda
          </span>
          <Link href="/login">
            <span className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
              Já tem conta? Fazer login
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
