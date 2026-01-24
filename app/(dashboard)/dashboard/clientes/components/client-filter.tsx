"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function ClientFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [, startTransition] = useTransition();

  const handleSearch = (term: string) => {
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
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 z-10" />
      <Input
        placeholder="Buscar cliente..."
        className="pl-9 bg-white text-sm"
        defaultValue={searchParams.get("q")?.toString()}
        onChange={(e) => {
          const value = e.target.value;
          setTimeout(() => handleSearch(value), 300);
        }}
      />
    </div>
  );
}
