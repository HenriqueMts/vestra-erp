import { z } from "zod";

export const inventoryInputSchema = z.object({
  storeId: z.string().min(1, "Loja é obrigatória"),
  quantity: z.coerce.number().int().nonnegative().default(0),
});

export const variantInputSchema = z.object({
  id: z.string().optional(),
  colorId: z.string().optional().nullable(),
  sizeId: z.string().optional().nullable(),
  sku: z.string().min(1, "SKU é obrigatório"),
  inventory: z.array(inventoryInputSchema).default([]),
});

export const saveProductSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    categoryId: z.string().min(1, "Categoria é obrigatória"),
    price: z.coerce.number().positive("Preço deve ser maior que zero"),
    description: z.string().optional(),
    status: z.enum(["active", "inactive", "archived"]).default("active"),
    sku: z.string().optional(),
    images: z.array(z.string()).default([]),
    hasVariants: z.boolean().default(false),
    simpleInventory: z.array(inventoryInputSchema).default([]),
    variants: z.array(variantInputSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.hasVariants) {
        return data.variants.length > 0;
      }
      return true;
    },
    {
      message: "Adicione pelo menos uma variante",
      path: ["variants"],
    },
  )
  .refine(
    (data) => {
      if (!data.hasVariants && !data.sku) {
        return false;
      }
      return true;
    },
    {
      message: "SKU é obrigatório para produtos sem variantes",
      path: ["sku"],
    },
  );

export type SaveProductInput = z.infer<typeof saveProductSchema>;

export interface ProductOptions {
  categories: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; name: string }>;
  colors: Array<{ id: string; name: string; hex: string | null }>;
  sizes: Array<{ id: string; name: string }>;
}

export interface ProductInitialData {
  id?: string;
  name?: string;
  basePrice?: number;
  categoryId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  status?: "active" | "inactive" | "archived" | null;
  sku?: string | null;
  images?: Array<{ id: string; url: string; order: number | null }>;
  inventory?: Array<{ id: string; storeId: string; quantity: number }>;
  variants?: Array<{
    id: string;
    sku: string;
    colorId: string | null;
    sizeId: string | null;
    inventory: Array<{ id: string; storeId: string; quantity: number }>;
  }>;
}
