"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useRef } from "react";

export function ClientFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (term: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);

      if (term) {
        params.set("q", term);
      } else {
        params.delete("q");
      }

      params.set("page", "1");

      startTransition(() => {
        replace(`${pathname}?${params.toString()}`);
      });
    }, 300);
  };

  return (
    <div className="relative w-full sm:w-auto">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 z-10" />
      <Input
        placeholder="Buscar cliente..."
        className="pl-9 bg-white text-xs sm:text-sm"
        defaultValue={searchParams.get("q")?.toString()}
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
      />
    </div>
  );
}
