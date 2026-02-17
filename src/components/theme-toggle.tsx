"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: Readonly<{ className?: string }>) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "relative h-9 w-21 shrink-0 overflow-hidden rounded-full bg-muted",
          className
        )}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex h-9 w-21 shrink-0 items-center overflow-hidden rounded-full border border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isDark ? "bg-secondary" : "bg-muted",
        className
      )}
    >
      {/* Ícones dentro da track: sol à esquerda, lua à direita */}
      <span className="absolute left-0 flex h-full w-1/2 items-center justify-center text-muted-foreground">
        <Sun size={18} strokeWidth={2} aria-hidden />
      </span>
      <span className="absolute right-0 flex h-full w-1/2 items-center justify-center text-muted-foreground">
        <Moon size={18} strokeWidth={2} aria-hidden />
      </span>
      {/* Thumb deslizante: claro no modo escuro (lua), escuro no modo claro (sol) */}
      <span
        className={cn(
          "absolute top-1 h-7 w-7 rounded-full shadow-md transition-all duration-200",
          isDark ? "left-1 bg-primary-foreground" : "left-[calc(100%-1.75rem-0.25rem)] bg-primary"
        )}
      />
    </button>
  );
}
