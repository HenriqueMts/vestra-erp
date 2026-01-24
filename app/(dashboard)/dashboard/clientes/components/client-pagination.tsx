"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ClientPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function ClientPagination({
  currentPage,
  totalPages,
}: ClientPaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  return (
    <Pagination className="justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={createPageURL(currentPage - 1)}
            aria-disabled={currentPage <= 1}
            className={
              currentPage <= 1
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
            onClick={(e) => {
              if (currentPage <= 1) e.preventDefault();
            }}
          />
        </PaginationItem>

        <div className="mx-4 text-sm text-slate-500 font-medium">
          Página {currentPage} de {totalPages}
        </div>

        <PaginationItem>
          <PaginationNext
            href={createPageURL(currentPage + 1)}
            aria-disabled={currentPage >= totalPages}
            className={
              currentPage >= totalPages
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
            onClick={(e) => {
              if (currentPage >= totalPages) e.preventDefault();
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
