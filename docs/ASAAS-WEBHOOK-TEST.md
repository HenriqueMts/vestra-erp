# Como Testar o Webhook do Asaas

## 🚀 Teste Rápido (Recomendado)

### Passo 1: Encontre o Customer ID

1. Acesse `/minha-conta` como admin
2. Veja a coluna **"Asaas Customer ID"** na tabela (ex: `cus_xxxxx`)
3. Copie esse ID

### Passo 2: Teste Local (Windows PowerShell)

```powershell
# Teste PAYMENT_RECEIVED (ativar acesso)
.\scripts\test-webhook.ps1 -CustomerId "cus_SEU_CUSTOMER_ID_AQUI" -EventType "PAYMENT_RECEIVED"

# Teste PAYMENT_OVERDUE (bloquear acesso)
.\scripts\test-webhook.ps1 -CustomerId "cus_SEU_CUSTOMER_ID_AQUI" -EventType "PAYMENT_OVERDUE"
```

### Passo 3: Verifique os Resultados

1. **Logs do servidor:** Procure por `[Asaas Webhook]` no terminal onde está rodando `npm run dev`
2. **Banco de dados:** Execute no Supabase SQL Editor:
   ```sql
   SELECT name, asaas_customer_id, billing_status, access_suspended_at 
   FROM organizations 
   WHERE asaas_customer_id = 'cus_SEU_CUSTOMER_ID_AQUI';
   ```
3. **Teste de bloqueio:** Se enviou `PAYMENT_OVERDUE`, tente fazer login com um usuário dessa organização

---

## Opção 1: Teste Manual (Simular Evento)

Você pode criar um script ou usar um cliente HTTP para simular um evento do Asaas:

### Usando cURL (Terminal)

```bash
# Teste PAYMENT_RECEIVED
curl -X POST "http://localhost:3000/api/asaas/webhook?token=GFRX604l0msDhqbZr0v9VoA6" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test_123",
      "customer": "cus_SEU_CUSTOMER_ID_AQUI",
      "status": "RECEIVED",
      "value": 100.00,
      "dueDate": "2026-02-20",
      "paymentDate": "2026-02-17"
    }
  }'

# Teste PAYMENT_OVERDUE
curl -X POST "http://localhost:3000/api/asaas/webhook?token=GFRX604l0msDhqbZr0v9VoA6" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_OVERDUE",
    "payment": {
      "id": "pay_test_456",
      "customer": "cus_SEU_CUSTOMER_ID_AQUI",
      "status": "OVERDUE",
      "value": 100.00,
      "dueDate": "2026-02-10"
    }
  }'
```

**⚠️ IMPORTANTE:** Substitua `cus_SEU_CUSTOMER_ID_AQUI` pelo `asaasCustomerId` real de uma organização no seu banco.

### Usando Postman ou Insomnia

1. **Método:** POST
2. **URL:** `http://localhost:3000/api/asaas/webhook?token=GFRX604l0msDhqbZr0v9VoA6`
3. **Headers:**
   - `Content-Type: application/json`
4. **Body (JSON):**
```json
{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_test_123",
    "customer": "cus_SEU_CUSTOMER_ID_AQUI",
    "status": "RECEIVED",
    "value": 100.00,
    "dueDate": "2026-02-20",
    "paymentDate": "2026-02-17"
  }
}
```

## Opção 2: Teste com Evento Real do Asaas (Produção/Sandbox)

### Passo 1: Expor o servidor local (se testando localmente)

Se você está testando localmente, precisa expor seu servidor para o Asaas conseguir enviar eventos:

#### Usando ngrok:

1. **Instale o ngrok:** https://ngrok.com/download
2. **Inicie seu servidor Next.js:**
   ```bash
   npm run dev
   ```
3. **Em outro terminal, inicie o ngrok:**
   ```bash
   ngrok http 3000
   ```
4. **Copie a URL HTTPS** (ex: `https://abc123.ngrok.io`)
5. **Atualize o webhook no painel Asaas** com:
   ```
   https://abc123.ngrok.io/api/asaas/webhook?token=GFRX604l0msDhqbZr0v9VoA6
   ```

### Passo 2: Criar um pagamento de teste no Asaas

1. Acesse o painel do Asaas (sandbox ou produção)
2. Vá em **Cobranças** → **Nova cobrança**
3. Selecione o cliente (organização) que você cadastrou
4. Crie uma cobrança de teste com valor pequeno (ex: R$ 1,00)
5. Aguarde o evento ser enviado ao webhook

### Passo 3: Verificar os logs

**No terminal do servidor Next.js**, você deve ver:

```
[Asaas Webhook] Evento recebido: PAYMENT_RECEIVED Payment: pay_xxx
[Asaas Webhook] Pagamento recebido para Nome da Organização - Ativando acesso
[Asaas Webhook] Status atualizado para Nome da Organização: active
```

## Opção 3: Verificar no Banco de Dados

Após receber um evento, verifique se o status foi atualizado:

```sql
-- Ver status de todas as organizações
SELECT 
  id,
  name,
  asaas_customer_id,
  billing_status,
  access_suspended_at
FROM organizations
WHERE asaas_customer_id IS NOT NULL;
```

## Opção 4: Teste de Bloqueio de Acesso

1. **Envie um evento `PAYMENT_OVERDUE`** (via cURL ou criando uma cobrança vencida no Asaas)
2. **Verifique no banco** se `billing_status = 'suspended'`
3. **Tente fazer login** com um usuário dessa organização
4. **Deve redirecionar** para `/minha-conta?blocked=suspended`
5. **Envie um evento `PAYMENT_RECEIVED`** para reativar
6. **Verifique** se o acesso foi restaurado

## Verificações Importantes

### ✅ Checklist de Testes

- [ ] Webhook recebe eventos (ver logs do servidor)
- [ ] Token de autenticação funciona (teste com token errado deve retornar 401)
- [ ] Evento `PAYMENT_RECEIVED` atualiza `billing_status = 'active'`
- [ ] Evento `PAYMENT_OVERDUE` atualiza `billing_status = 'suspended'`
- [ ] Organização correta é atualizada (verifica pelo `customer` ID)
- [ ] Usuário bloqueado não consegue acessar dashboard/POS
- [ ] Usuário reativado consegue acessar normalmente

### 🔍 Como Verificar se Está Funcionando

1. **Logs do servidor:** Procure por `[Asaas Webhook]` no terminal
2. **Resposta HTTP:** O webhook deve retornar `200 OK` com `{"success": true}`
3. **Banco de dados:** Verifique se `billing_status` mudou
4. **Painel do Asaas:** Vá em **Integrações** → **Logs de Webhooks** para ver tentativas de envio

### ❌ Problemas Comuns

**Webhook não recebe eventos:**
- Verifique se a URL está correta no painel Asaas
- Verifique se o token na URL corresponde ao `ASAAS_WEBHOOK_TOKEN`
- Verifique se o servidor está rodando e acessível
- Para local: use ngrok e atualize a URL no painel

**Token inválido:**
- Verifique se o token na URL é exatamente igual ao do `.env.local`
- Não há espaços extras ou caracteres especiais

**Organização não encontrada:**
- Verifique se o `customer` ID do evento corresponde ao `asaasCustomerId` no banco
- Verifique se a organização foi cadastrada no Asaas corretamente

**Status não atualiza:**
- Verifique os logs para erros
- Verifique se as colunas `billing_status` e `access_suspended_at` existem no banco
- Execute o SQL em `supabase-asaas-billing.sql` se necessário
