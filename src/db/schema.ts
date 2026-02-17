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
//  ENUMS
// ----------------------------------------------------------------------
export const typeEnum = pgEnum("client_type", ["PF", "PJ"]);
export const roleEnum = pgEnum("role", ["owner", "manager", "seller"]);
export const statusEnum = pgEnum("status", ["active", "inactive", "archived"]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "pix",
  "credit",
  "debit",
  "cash",
]);

// ----------------------------------------------------------------------
//  AUTH & ORGANIZATIONS
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
  // Asaas: cobrança de planos (uma conta Vestra, clientes = organizações)
  asaasCustomerId: text("asaas_customer_id"),
  asaasSubscriptionId: text("asaas_subscription_id"),
  planValueCents: integer("plan_value_cents"),
  planBillingDay: integer("plan_billing_day"),
  billingStatus: text("billing_status").$type<"active" | "overdue" | "suspended">().default("active"),
  accessSuspendedAt: timestamp("access_suspended_at"),
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
//  PRODUTOS
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
      table.slug
    ),
  })
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

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  categoryId: uuid("category_id").references(() => categories.id),

  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),

  sku: text("sku"),

  basePrice: integer("base_price").notNull(),
  costPrice: integer("cost_price"),

  status: statusEnum("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),

  // Campos fiscais obrigatórios para emissão de NFC-e
  ncm: text("ncm").default("00000000").notNull(),
  origin: text("origin").default("0").notNull(),
  cfop: text("cfop").default("5102"),
  cest: text("cest"),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),

  colorId: uuid("color_id").references(() => colors.id),
  sizeId: uuid("size_id").references(() => sizes.id),

  // SKU da variante = SKU do produto (pai); não é único por variante
  sku: text("sku").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),

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
    uniqueProductStock: uniqueIndex("unique_product_stock").on(
      table.storeId,
      table.productId
    ),
    uniqueVariantStock: uniqueIndex("unique_variant_stock").on(
      table.storeId,
      table.variantId
    ),
  })
);

// ----------------------------------------------------------------------
//  CLIENTES
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
      table.document
    ),
  })
);

// ----------------------------------------------------------------------
//  VENDAS (POS)
// ----------------------------------------------------------------------
// Configurações fiscais (1:1 com Organization) — Focus NFe / NFC-e
export const invoiceSettings = pgTable("invoice_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(false).notNull(),
  providerToken: text("provider_token"),
  environment: text("environment").default("homologation"),
  cscId: text("csc_id"),
  cscToken: text("csc_token"),
  certificateId: text("certificate_id"),
  /** Status do certificado na Focus (ex.: valid). Não guardamos o .pfx. */
  certificateStatus: text("certificate_status"),
  /** Inscrição Estadual (para cadastro na Focus). */
  ie: text("ie"),
  /** Inscrição Municipal (para cadastro na Focus). */
  im: text("im"),
  /** 1=Simples Nacional, 2=Excesso sublimite, 3=Normal. */
  regimeTributario: text("regime_tributario"),
  /** Endereço fiscal (cadastro Focus). */
  cep: text("cep"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  municipio: text("municipio"),
  uf: text("uf"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "restrict" }),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  totalCents: integer("total_cents").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  // Campos fiscais (nullable — nem todos emitem nota)
  invoiceStatus: text("invoice_status"),
  invoiceUrl: text("invoice_url"),
  invoiceXml: text("invoice_xml"),
  invoiceNumber: integer("invoice_number"),
  invoiceSeries: integer("invoice_series"),
});

// ----------------------------------------------------------------------
//  FECHAMENTO DE CAIXA
// ----------------------------------------------------------------------
export const cashClosures = pgTable("cash_closures", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  closedBy: uuid("closed_by")
    .notNull()
    .references(() => profiles.id, { onDelete: "restrict" }),
  totalCents: integer("total_cents").notNull(),
  salesCount: integer("sales_count").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

// ----------------------------------------------------------------------
//  RELATIONS
// ----------------------------------------------------------------------

export const organizationRelations = relations(organizations, ({ one, many }) => ({
  stores: many(stores),
  members: many(members),
  clients: many(clients),
  products: many(products),
  categories: many(categories),
  colors: many(colors),
  sizes: many(sizes),
  sales: many(sales),
  cashClosures: many(cashClosures),
  invoiceSettings: one(invoiceSettings),
}));

export const invoiceSettingsRelations = relations(invoiceSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoiceSettings.organizationId],
    references: [organizations.id],
  }),
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
  images: many(productImages),
  inventory: many(inventory),
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
    fields: [inventory.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
}));

export const clientRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [sales.organizationId],
    references: [organizations.id],
  }),
  store: one(stores, {
    fields: [sales.storeId],
    references: [stores.id],
  }),
  client: one(clients, {
    fields: [sales.clientId],
    references: [clients.id],
  }),
  seller: one(profiles, {
    fields: [sales.sellerId],
    references: [profiles.id],
  }),
  items: many(saleItems),
}));

export const cashClosureRelations = relations(cashClosures, ({ one }) => ({
  organization: one(organizations, {
    fields: [cashClosures.organizationId],
    references: [organizations.id],
  }),
  store: one(stores, {
    fields: [cashClosures.storeId],
    references: [stores.id],
  }),
  closedByUser: one(profiles, {
    fields: [cashClosures.closedBy],
    references: [profiles.id],
  }),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [saleItems.variantId],
    references: [productVariants.id],
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
  sales: many(sales),
}));
