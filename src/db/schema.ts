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
// 1. ENUMS (As regras do jogo)
// ----------------------------------------------------------------------
export const typeEnum = pgEnum("client_type", ["PF", "PJ"]);
export const roleEnum = pgEnum("role", ["owner", "manager", "seller"]);

// ----------------------------------------------------------------------
// 2. TABELAS ESTRUTURAIS (A Base do SaaS)
// ----------------------------------------------------------------------

// PERFIL DO USUÁRIO
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  mustChangePassword: boolean("must_change_password").default(false),
});

// ORGANIZAÇÃO
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  document: text("document"),
  logoUrl: text("logo_url"),
  plan: text("plan").default("pro"),
  createdAt: timestamp("created_at").defaultNow(),
});

// LOJAS
export const stores = pgTable("stores", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// MEMBROS
export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  storeId: uuid("store_id").references(() => stores.id), // Se NULL, é staff da Matriz
  role: roleEnum("role").default("seller").notNull(), // owner, manager, seller
  createdAt: timestamp("created_at").defaultNow(),
});

// ----------------------------------------------------------------------
// 3. TABELAS DE NEGÓCIO (ERP)
// ----------------------------------------------------------------------

// CLIENTES (Agora pertencem à Organização, não ao Usuário)
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
    document: varchar("document", { length: 18 }).notNull(), // CPF ou CNPJ
    phone: varchar("phone", { length: 20 }),
    email: text("email"),

    address: text("address"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      uniqueDocumentPerOrg: uniqueIndex("unique_document_per_org").on(
        table.organizationId,
        table.document,
      ),
    };
  },
);

// PRODUTOS (Catálogo Global da Empresa)
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    sku: text("sku").notNull(),
    price: integer("price").notNull(),
    costPrice: integer("cost_price"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      uniqueSkuPerOrg: uniqueIndex("unique_sku_per_org").on(
        table.organizationId,
        table.sku,
      ),
    };
  },
);

// ESTOQUE (Saldo por Loja)
export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    quantity: integer("quantity").default(0).notNull(),
    minStock: integer("min_stock").default(5),

    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => {
    return {
      uniqueProductPerStore: uniqueIndex("unique_product_per_store").on(
        table.storeId,
        table.productId,
      ),
    };
  },
);

// ----------------------------------------------------------------------
// 4. RELATIONS
// ----------------------------------------------------------------------

export const organizationRelations = relations(organizations, ({ many }) => ({
  stores: many(stores),
  members: many(members),
  clients: many(clients),
  products: many(products),
}));

export const clientRelations = relations(clients, ({ one }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
}));

export const productRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  inventory: many(inventory),
}));

export const membersRelations = relations(members, ({ one }) => ({
  organization: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  store: one(stores, {
    fields: [members.storeId],
    references: [stores.id],
  }),
  user: one(profiles, {
    fields: [members.userId],
    references: [profiles.id],
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
