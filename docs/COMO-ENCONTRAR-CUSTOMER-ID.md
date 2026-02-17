# Como Encontrar o Customer ID do Asaas

O **Customer ID** é o identificador único do cliente no Asaas. Ele é salvo na tabela `organizations` na coluna `asaas_customer_id` após cadastrar uma organização no Asaas.

## Opção 1: Supabase SQL Editor (Mais Rápido) ⚡

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** → **New query**
4. Cole e execute:

```sql
SELECT 
  id,
  name,
  asaas_customer_id,
  billing_status,
  access_suspended_at
FROM organizations
WHERE asaas_customer_id IS NOT NULL;
```

5. Copie o valor da coluna `asaas_customer_id` (ex: `cus_xxxxx`)

**Ou para ver todas as organizações:**

```sql
SELECT 
  name,
  asaas_customer_id,
  asaas_subscription_id,
  plan_value_cents,
  plan_billing_day,
  billing_status
FROM organizations
ORDER BY name;
```

## Opção 2: Interface Web (`/minha-conta`)

1. Acesse `/minha-conta` como **admin da plataforma**
2. Na tabela de organizações, veja a coluna **"Asaas"**
3. Se estiver cadastrado, você verá:
   - ✅ **Cadastrado**
   - Abaixo: o Customer ID em fonte monoespaçada (ex: `cus_xxxxx`)

## Opção 3: Via API/Console do Navegador

Se você tem acesso ao console do navegador:

1. Abra `/minha-conta` como admin
2. Abra o **DevTools** (F12)
3. Vá na aba **Network**
4. Recarregue a página
5. Procure pela requisição que busca as organizações
6. Veja o JSON de resposta com os `asaasCustomerId`

## Exemplo de Customer ID

O formato do Customer ID do Asaas é:
```
cus_xxxxxxxxxxxxxxxxxxxxx
```

Exemplos:
- `cus_00000000000000000000000000000000`
- `cus_Y4AEif5zrMGK`
- `cus_abc123def456`

## Quando o Customer ID é Criado?

O Customer ID é criado quando você:
1. Acessa `/minha-conta` como admin
2. Clica em **"Cadastrar no Asaas"** para uma organização
3. O sistema faz `POST /v3/customers` no Asaas
4. O Asaas retorna o ID (ex: `cus_xxx`)
5. O ID é salvo em `organizations.asaas_customer_id`

## Usar o Customer ID para Testar o Webhook

Depois de encontrar o Customer ID, use nos scripts de teste:

**PowerShell:**
```powershell
.\scripts\test-webhook.ps1 -CustomerId "cus_xxxxx" -EventType "PAYMENT_RECEIVED"
```

**cURL:**
```bash
curl -X POST "http://localhost:3000/api/asaas/webhook?token=GFRX604l0msDhqbZr0v9VoA6" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test_123",
      "customer": "cus_xxxxx",
      "status": "RECEIVED",
      "value": 100.00,
      "dueDate": "2026-02-20",
      "paymentDate": "2026-02-17"
    }
  }'
```

## Troubleshooting

**Não encontro nenhum Customer ID:**
- Nenhuma organização foi cadastrada no Asaas ainda
- Vá em `/minha-conta` e clique em **"Cadastrar no Asaas"** para uma organização

**O Customer ID está NULL:**
- O cadastro no Asaas falhou
- Verifique os logs do servidor para erros
- Tente cadastrar novamente
