import Link from "next/link";
import { TerminalSquare } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-100 bg-white py-6 mt-auto">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>
          &copy; {currentYear} Jilem Modas CRM. Todos os direitos reservados.
        </p>

        <Link
          href="https://eduardo-henrique-portfolio.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 group hover:text-slate-900 transition-colors"
        >
          <TerminalSquare
            size={14}
            className="text-slate-400 group-hover:text-indigo-600 transition-colors"
          />
          <span className="font-medium tracking-wide">
            Software Engineering by{" "}
            <span className="font-bold text-slate-700 group-hover:text-black">
              E.H
            </span>
          </span>
        </Link>
      </div>
    </footer>
  );
}
