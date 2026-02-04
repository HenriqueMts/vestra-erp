import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  pgEnum,
  uniqueIndex,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ----------------------------------------------------------------------
// 1. ENUMS
// ----------------------------------------------------------------------
export const typeEnum = pgEnum("client_type", ["PF", "PJ"]);
export const roleEnum = pgEnum("role", ["owner", "manager", "seller"]);
export const statusEnum = pgEnum("status", ["active", "inactive", "archived"]);

// ----------------------------------------------------------------------
// 2. TABELAS ESTRUTURAIS (Auth & Org)
// ----------------------------------------------------------------------

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  mustChangePassword: boolean("must_change_password").default(false),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  document: text("document"),
  logoUrl: text("logo_url"),
  plan: text("plan").default("enterprise"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stores = pgTable("stores", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  userId: uuid("user_id").references(() => profiles.id, {
    onDelete: "cascade",
  }),

  email: text("email").notNull(),

  defaultStoreId: uuid("default_store_id").references(() => stores.id, {
    onDelete: "set null",
  }),

  role: roleEnum("role").default("seller").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ----------------------------------------------------------------------
// 3. TABELAS DE PRODUTOS (CATÁLOGO AVANÇADO)
// ----------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueCategoryPerOrg: uniqueIndex("unique_category_per_org").on(
      table.organizationId,
      table.slug,
    ),
  }),
);

export const colors = pgTable("colors", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hex: text("hex"),
});

export const sizes = pgTable("sizes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").default(0),
});

// PRODUTO PAI (A "Vitrine")
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  categoryId: uuid("category_id").references(() => categories.id),

  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"), // Foto de Capa

  sku: text("sku"), // Opcional no pai se usar variantes, ou obrigatório se for produto simples. Deixei flexível.

  basePrice: integer("base_price").notNull(),
  costPrice: integer("cost_price"),

  status: statusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// IMAGENS SECUNDÁRIAS (Galeria)
export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    colorId: uuid("color_id").references(() => colors.id),
    sizeId: uuid("size_id").references(() => sizes.id),

    sku: text("sku").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueSku: uniqueIndex("unique_sku_variant").on(table.sku),
  }),
);

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),

    // ATUALIZAÇÃO CRÍTICA: Aceita Produto OU Variante
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),

    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "cascade",
    }),

    quantity: integer("quantity").default(0).notNull(),
    minStock: integer("min_stock").default(5),

    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Garante unicidade do estoque para Produto Simples
    uniqueProductStock: uniqueIndex("unique_product_stock").on(
      table.storeId,
      table.productId,
    ),
    // Garante unicidade do estoque para Variantes (quando houver)
    uniqueVariantStock: uniqueIndex("unique_variant_stock").on(
      table.storeId,
      table.variantId,
    ),
  }),
);

// ----------------------------------------------------------------------
// 4. CLIENTES
// ----------------------------------------------------------------------
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => profiles.id),
    name: text("name").notNull(),
    type: typeEnum("type").notNull().default("PF"),
    document: varchar("document", { length: 18 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    email: text("email"),
    address: text("address"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueDocumentPerOrg: uniqueIndex("unique_document_per_org").on(
      table.organizationId,
      table.document,
    ),
  }),
);

// ----------------------------------------------------------------------
//  RELATIONS
// ----------------------------------------------------------------------

export const organizationRelations = relations(organizations, ({ many }) => ({
  stores: many(stores),
  members: many(members),
  clients: many(clients),
  products: many(products),
  categories: many(categories),
  colors: many(colors),
  sizes: many(sizes),
}));

export const categoryRelations = relations(categories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [categories.organizationId],
    references: [organizations.id],
  }),
  products: many(products),
}));

export const productRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
  images: many(productImages), // Relação Nova
  inventory: many(inventory), // Relação Direta de Estoque
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const variantRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  color: one(colors, {
    fields: [productVariants.colorId],
    references: [colors.id],
  }),
  size: one(sizes, {
    fields: [productVariants.sizeId],
    references: [sizes.id],
  }),
  inventory: many(inventory),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  store: one(stores, {
    fields: [inventory.storeId],
    references: [stores.id],
  }),
  product: one(products, {
    // Relação Opcional com Produto
    fields: [inventory.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
}));

export const clientRelations = relations(clients, ({ one }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
}));

export const membersRelations = relations(members, ({ one }) => ({
  organization: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),

  user: one(profiles, {
    fields: [members.userId],
    references: [profiles.id],
  }),

  store: one(stores, {
    fields: [members.defaultStoreId],
    references: [stores.id],
  }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [stores.organizationId],
    references: [organizations.id],
  }),
  inventory: many(inventory),
  members: many(members),
}));
