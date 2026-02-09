import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import * as schema from "@/db/schema";

// --- ENUMS ---
export type Role = "owner" | "manager" | "seller";
export type ProductStatus = "active" | "inactive" | "archived";
export type ClientType = "PF" | "PJ";

// --- TABELAS PRINCIPAIS -----------------------------------------------
export type Profile = InferSelectModel<typeof schema.profiles>;
export type Organization = InferSelectModel<typeof schema.organizations>;
export type Store = InferSelectModel<typeof schema.stores>;
export type Member = InferSelectModel<typeof schema.members>;

// --- PRODUTOS & ESTOQUE ------------------------------------------------
export type Category = InferSelectModel<typeof schema.categories>;
export type Color = InferSelectModel<typeof schema.colors>;
export type Size = InferSelectModel<typeof schema.sizes>;
export type Product = InferSelectModel<typeof schema.products>;
export type ProductImage = InferSelectModel<typeof schema.productImages>;
export type ProductVariant = InferSelectModel<typeof schema.productVariants>;
export type Inventory = InferSelectModel<typeof schema.inventory>;

// --- CLIENTES ----------------------------------------------------------
export type Client = InferSelectModel<typeof schema.clients>;

// --- TIPOS DE INSERÇÃO -------------------------------------------------
// Útil quando você precisa tipar o objeto antes de salvar, onde ID e CreatedAt são opcionais
export type NewProduct = InferInsertModel<typeof schema.products>;
export type NewVariant = InferInsertModel<typeof schema.productVariants>;
export type NewInventory = InferInsertModel<typeof schema.inventory>;

// --- TIPOS COM RELACIONAMENTOS -----------------------------------------
// Exemplo: Um produto completo com suas relações carregadas
export type ProductWithRelations = Product & {
  category: Category | null;
  images: ProductImage[];
  variants: (ProductVariant & {
    color: Color | null;
    size: Size | null;
    inventory: Inventory[];
  })[];
  inventory: Inventory[]; 
};