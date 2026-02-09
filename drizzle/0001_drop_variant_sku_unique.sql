-- Variantes passam a usar o SKU do produto (pai); removemos o índice único por variante
DROP INDEX IF EXISTS "unique_sku_variant";
