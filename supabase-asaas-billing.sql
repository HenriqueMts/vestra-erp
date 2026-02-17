-- =============================================================================
-- Asaas: cobrança de planos (colunas em organizations)
-- Rodar no SQL Editor do Supabase (Dashboard > SQL Editor > New query).
-- Cole o conteúdo abaixo e execute (Run). Isso corrige o erro "Failed query"
-- ao carregar sessão quando as colunas ainda não existem no banco.
-- =============================================================================

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS asaas_customer_id text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS asaas_subscription_id text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan_value_cents integer;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan_billing_day integer;
