-- Adiciona a coluna surcharge_cents (acréscimo) na tabela sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS surcharge_cents integer DEFAULT 0;

-- Adiciona a coluna channel (canal de venda) na tabela sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS channel text DEFAULT 'store';
