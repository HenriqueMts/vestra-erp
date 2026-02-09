"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";

const filterSchema = z.object({
  name: z.string().optional(),
  status: z.string().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

export function ProductFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      name: searchParams.get("q") ?? "",
      status: searchParams.get("status") ?? "all",
    },
  });

  function onSubmit(data: FilterValues) {
    const params = new URLSearchParams(searchParams);

    if (data.name) {
      params.set("q", data.name);
    } else {
      params.delete("q");
    }

    if (data.status && data.status !== "all") {
      params.set("status", data.status);
    } else {
      params.delete("status");
    }

    params.set("page", "1");
    replace(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    form.reset({ name: "", status: "all" });
    replace(pathname);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="w-full sm:w-[200px] lg:w-[250px] space-y-0">
              <FormControl>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Buscar produto..."
                    className="pl-9 bg-white text-sm sm:text-base"
                    {...field}
                  />
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="w-full sm:w-[140px] lg:w-[150px] space-y-0">
              <Select
                onValueChange={(val) => {
                  field.onChange(val);
                  form.handleSubmit(onSubmit)();
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="bg-white text-sm sm:text-base">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="archived">Arquivados</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="secondary"
            className="flex-1 sm:flex-none text-sm sm:text-base"
          >
            Filtrar
          </Button>
          {(searchParams.get("q") || searchParams.get("status")) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearFilters}
              title="Limpar filtros"
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
