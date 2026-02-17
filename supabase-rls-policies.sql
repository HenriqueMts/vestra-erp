-- =============================================================================
-- RLS (Row Level Security) - Vestra ERP
-- Cole no SQL Editor do Supabase. Execute em staging primeiro, depois produção.
--
-- IMPORTANTE:
-- - A aplicação usa Drizzle com DATABASE_URL (conexão direta ao Postgres).
--   No Supabase, essa conexão usa um role que pode ter BYPASSRLS; nesse caso
--   o backend (Next.js + Drizzle) não é afetado pelas policies.
-- - As policies abaixo protegem acessos feitos via API Supabase com JWT
--   (chave anon/authenticated), garantindo isolamento por organização.
--
-- Se algo quebrar: desabilite RLS por tabela com:
--   ALTER TABLE public.<tabela> DISABLE ROW LEVEL SECURITY;
-- =============================================================================

-- Função auxiliar: retorna os organization_id das organizações do usuário logado
CREATE OR REPLACE FUNCTION public.current_user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.members WHERE user_id = auth.uid();
$$;

-- =============================================================================
-- PROFILES
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Inserção de profile geralmente feita por trigger ou signup (service role)
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT USING (id IN (SELECT public.current_user_organization_ids()));

DROP POLICY IF EXISTS "organizations_update_member_owner" ON public.organizations;
CREATE POLICY "organizations_update_member_owner" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM public.members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- INSERT de organizations geralmente no signup (pode ser service role)
DROP POLICY IF EXISTS "organizations_insert_authenticated" ON public.organizations;
CREATE POLICY "organizations_insert_authenticated" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- MEMBERS
-- =============================================================================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select_same_org" ON public.members;
CREATE POLICY "members_select_same_org" ON public.members
  FOR SELECT USING (organization_id IN (SELECT public.current_user_organization_ids()));

DROP POLICY IF EXISTS "members_insert_owner_manager" ON public.members;
CREATE POLICY "members_insert_owner_manager" ON public.members
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "members_update_owner_manager" ON public.members;
CREATE POLICY "members_update_owner_manager" ON public.members
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "members_delete_owner" ON public.members;
CREATE POLICY "members_delete_owner" ON public.members
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- =============================================================================
-- STORES
-- =============================================================================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_all_org_member" ON public.stores;
CREATE POLICY "stores_all_org_member" ON public.stores
  FOR ALL USING (organization_id IN (SELECT public.current_user_organization_ids()));

-- =============================================================================
-- CATEGORIES
-- =============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_all_org_member" ON public.categories;
CREATE POLICY "categories_all_org_member" ON public.categories
  FOR ALL USING (organization_id IN (SELECT public.current_user_organization_ids()));

-- =============================================================================
-- COLORS
-- =============================================================================
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "colors_all_org_member" ON public.colors;
CREATE POLICY "colors_all_org_member" ON public.colors
  FOR ALL USING (organization_id IN (SELECT public.current_user_organization_ids()));

-- =============================================================================
-- SIZES
-- =============================================================================
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sizes_all_org_member" ON public.sizes;
CREATE POLICY "sizes_all_org_member" ON public.sizes
  FOR ALL USING (organization_id IN (SELECT public.current_user_organization_ids()));

-- =============================================================================
-- PRODUCTS
-- =============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_all_org_member" ON public.products;
CREATE POLICY "products_all_org_member" ON public.products
  FOR ALL USING (organization_id IN (SELECT public.current_user_organization_ids()));

-- =============================================================================
-- PRODUCT_IMAGES (via product -> organization)
-- =============================================================================
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_images_via_product" ON public.product_images;
CREATE POLICY "product_images_via_product" ON public.product_images
  FOR ALL USING (
    product_id IN (
      SELECT id FROM public.products
      WHERE organization_id IN (SELECT public.current_user_organization_ids())
    )
  );

-- =============================================================================
-- PRODUCT_VARIANTS (via product -> organization)
-- =============================================================================
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_variants_via_product" ON public.product_variants;
CREATE POLICY "product_variants_via_product" ON public.product_variants
  FOR ALL USING (
    product_id IN (
      SELECT id FROM public.products
      WHERE organization_id IN (SELECT public.current_user_organization_ids())
    )
  );

-- =============================================================================
-- INVENTORY (via store -> organization)
-- =============================================================================
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_via_store" ON public.inventory;
CREATE POLICY "inventory_via_store" ON public.inventory
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores
      WHERE organization_id IN (SELECT public.current_user_organization_ids())
    )
  );

-- =============================================================================
-- CLIENTS
-- =============================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_all_org_member" ON public.clients;
CREATE POLICY "clients_all_org_member" ON public.clients
  FOR ALL USING (organization_id IN (SELECT public.current_user_organization_ids()));

-- =============================================================================
-- INVOICE_SETTINGS
-- =============================================================================
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_settings_select_org" ON public.invoice_settings;
CREATE POLICY "invoice_settings_select_org" ON public.invoice_settings
  FOR SELECT USING (organization_id IN (SELECT public.current_user_organization_ids()));

DROP POLICY IF EXISTS "invoice_settings_modify_owner_manager" ON public.invoice_settings;
CREATE POLICY "invoice_settings_modify_owner_manager" ON public.invoice_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Garantir INSERT/UPDATE para owner/manager (FOR ALL já cobre)
-- =============================================================================
-- SALES
-- =============================================================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_all_org_member" ON public.sales;
CREATE POLICY "sales_all_org_member" ON public.sales
  FOR ALL USING (organization_id IN (SELECT public.current_user_organization_ids()));

-- =============================================================================
-- SALE_ITEMS (via sale -> organization)
-- =============================================================================
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_items_via_sale" ON public.sale_items;
CREATE POLICY "sale_items_via_sale" ON public.sale_items
  FOR ALL USING (
    sale_id IN (
      SELECT id FROM public.sales
      WHERE organization_id IN (SELECT public.current_user_organization_ids())
    )
  );

-- =============================================================================
-- CASH_CLOSURES
-- =============================================================================
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_closures_all_org_member" ON public.cash_closures;
CREATE POLICY "cash_closures_all_org_member" ON public.cash_closures
  FOR ALL USING (organization_id IN (SELECT public.current_user_organization_ids()));

-- =============================================================================
-- Conceder execução da função ao role authenticated (Supabase JWT)
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.current_user_organization_ids() TO authenticated;
