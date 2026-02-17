-- =============================================================================
-- Script para rodar no SQL Editor do Supabase
-- Alinha o banco ao schema Drizzle: invoice_settings, campos fiscais em sales e products
-- =============================================================================

-- 1) Tabela invoice_settings (1:1 com organizations)
CREATE TABLE IF NOT EXISTS "invoice_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE CASCADE,
  "is_active" boolean NOT NULL DEFAULT false,
  "provider_token" text,
  "environment" text DEFAULT 'homologation',
  "csc_id" text,
  "csc_token" text,
  "certificate_id" text,
  "certificate_status" text,
  "ie" text,
  "im" text,
  "regime_tributario" text,
  "cep" text,
  "logradouro" text,
  "numero" text,
  "complemento" text,
  "bairro" text,
  "municipio" text,
  "uf" text,
  "updated_at" timestamp DEFAULT now()
);

-- Se a tabela já existir, adicione as novas colunas
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "certificate_status" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "ie" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "im" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "regime_tributario" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "cep" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "logradouro" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "numero" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "complemento" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "bairro" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "municipio" text;
ALTER TABLE "invoice_settings" ADD COLUMN IF NOT EXISTS "uf" text;

-- 2) Colunas fiscais em sales (nullable)
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_status" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_url" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_xml" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_number" integer;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_series" integer;

-- 3) Colunas fiscais em products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ncm" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "origin" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cfop" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cest" text;

-- Defaults em products
ALTER TABLE "products" ALTER COLUMN "ncm" SET DEFAULT '00000000';
ALTER TABLE "products" ALTER COLUMN "origin" SET DEFAULT '0';
ALTER TABLE "products" ALTER COLUMN "cfop" SET DEFAULT '5102';

-- Preencher produtos existentes que ficaram com NULL (antes de SET NOT NULL)
UPDATE "products"
SET "ncm" = COALESCE("ncm", '00000000'),
    "origin" = COALESCE("origin", '0'),
    "cfop" = COALESCE("cfop", '5102')
WHERE "ncm" IS NULL OR "origin" IS NULL OR "cfop" IS NULL;

-- Agora exigir NOT NULL em ncm e origin
ALTER TABLE "products" ALTER COLUMN "ncm" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "origin" SET NOT NULL;
