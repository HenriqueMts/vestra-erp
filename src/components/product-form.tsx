"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { saveProduct } from "@/actions/products";
import { toast } from "sonner";
import { ImageUpload } from "@/components/image-upload";

// Schema atualizado
const productSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  categoryId: z.string().min(1, { message: "Selecione uma categoria." }),
  price: z.coerce
    .number()
    .min(0.01, { message: "O preço deve ser maior que zero." }),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  // Novo campo no form
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  images: z.array(z.string()).default([]),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductImageDB {
  id: string;
  url: string;
  order: number | null;
}

interface ProductWithImages {
  id: string;
  name: string;
  categoryId: string | null;
  basePrice: number;
  description: string | null;
  imageUrl: string | null;
  // Precisamos receber o status atual do banco
  status?: "active" | "inactive" | "archived" | null;
  images: ProductImageDB[];
}

type CategoryOption = { id: string; name: string };

interface ProductFormProps {
  categories: CategoryOption[];
  initialData?: ProductWithImages | null;
  organizationId: string;
  onSuccess?: () => void;
}

export function ProductForm({
  categories,
  initialData,
  organizationId,
  onSuccess,
}: ProductFormProps) {
  const [loading, setLoading] = useState(false);

  const existingImages: string[] = [];

  if (initialData) {
    if (initialData.imageUrl) {
      existingImages.push(initialData.imageUrl);
    }
    if (initialData.images && Array.isArray(initialData.images)) {
      initialData.images.forEach((img) => existingImages.push(img.url));
    }
  }

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || "",
      price: initialData?.basePrice ? initialData.basePrice / 100 : 0,
      description: initialData?.description || "",
      categoryId: initialData?.categoryId || "",
      // Define o status inicial (se não tiver, assume active)
      status: initialData?.status || "active",
      quantity: 0,
      images: existingImages,
    },
  });

  const hasMessage = (v: unknown): v is { message: string } =>
    typeof v === "object" && v !== null && "message" in v;

  async function onSubmit(data: ProductFormValues) {
    setLoading(true);
    try {
      const result = await saveProduct(data, organizationId);

      if (result && "error" in result && result.error) {
        toast.error("Erro ao salvar", { description: String(result.error) });
      } else if (hasMessage(result)) {
        toast.success("Sucesso!", { description: result.message });
        if (!initialData) {
          form.reset({
            name: "",
            price: 0,
            description: "",
            categoryId: "",
            quantity: 0,
            status: "active",
            images: [],
            id: undefined,
          });
        }
        if (onSuccess) onSuccess();
      } else {
        toast.success("Sucesso!", {
          description: "Produto salvo com sucesso.",
        });
        if (onSuccess) onSuccess();
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
        <div className="grid gap-6 p-4 sm:p-6 border rounded-xl bg-white shadow-sm w-full">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {initialData ? "Editar Produto" : "Criar Produto"}
            </h3>
            <p className="text-sm text-slate-500">
              Informações gerais e galeria de fotos.
            </p>
          </div>

          <div className="space-y-6 w-full">
            {initialData?.id && (
              <input type="hidden" {...form.register("id")} />
            )}

            <div className="space-y-3 w-full">
              <div>
                <FormLabel>Galeria de Fotos</FormLabel>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium mt-1">
                  A foto com estrela ★ será a capa
                </p>
              </div>
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Regata Ana" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Venda (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* SELETOR DE STATUS (Novo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estoque só aparece na criação */}
              {!initialData && (
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Estoque Inicial
                        <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                          Matriz
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes..."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => window.history.back()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-slate-900 text-white min-w-[140px]"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {initialData ? "Salvar Alterações" : "Criar Produto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
