"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ProductPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function ProductPagination({
  currentPage,
  totalPages,
}: Readonly<ProductPaginationProps>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { push } = useRouter();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  return (
    <Pagination className="justify-center sm:justify-end">
      <PaginationContent className="flex-wrap gap-1 sm:gap-0">
        <PaginationItem>
          <PaginationPrevious
            href={createPageURL(currentPage - 1)}
            aria-disabled={currentPage <= 1}
            className={`text-xs sm:text-sm ${
              currentPage <= 1
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }`}
            onClick={(e) => {
              if (currentPage <= 1) e.preventDefault();
            }}
          />
        </PaginationItem>

        <div className="mx-2 sm:mx-4 text-xs sm:text-sm text-slate-500 font-medium whitespace-nowrap">
          {currentPage} de {totalPages}
        </div>

        <PaginationItem>
          <PaginationNext
            href={createPageURL(currentPage + 1)}
            aria-disabled={currentPage >= totalPages}
            className={`text-xs sm:text-sm ${
              currentPage >= totalPages
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }`}
            onClick={(e) => {
              if (currentPage >= totalPages) e.preventDefault();
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
