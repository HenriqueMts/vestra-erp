-- Configurações fiscais (1:1 com Organization)
CREATE TABLE IF NOT EXISTS "invoice_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE CASCADE,
  "is_active" boolean DEFAULT false NOT NULL,
  "provider_token" text,
  "environment" text DEFAULT 'homologation',
  "csc_id" text,
  "csc_token" text,
  "certificate_id" text,
  "updated_at" timestamp DEFAULT now()
);

-- Campos fiscais na tabela de vendas
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_status" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_url" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_xml" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_number" integer;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_series" integer;

-- Campos fiscais na tabela de produtos (NCM, origem, CFOP, CEST)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ncm" text DEFAULT '00000000' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "origin" text DEFAULT '0' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cfop" text DEFAULT '5102';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cest" text;
