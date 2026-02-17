# Configuração de Webhook do Asaas

## Versão da API

**Use a API v3** - O Vestra já está configurado para usar a versão 3 da API do Asaas (`/v3/customers`, `/v3/subscriptions`, etc.).

## Como criar o webhook no painel do Asaas

### 1. Acesse o painel do Asaas

- **Produção:** https://www.asaas.com
- **Sandbox:** https://sandbox.asaas.com

### 2. Navegue até Webhooks

1. Faça login na sua conta
2. No menu lateral, vá em **Integrações** → **Webhooks**
3. Clique em **Criar webhook** ou **Novo webhook**

### 3. Preencha os dados do webhook

**Campos obrigatórios:**

- **Nome:** `Vestra ERP - Pagamentos`
- **URL do webhook:** 
  - **IMPORTANTE:** Cole a URL COMPLETA incluindo o caminho `/api/asaas/webhook` e o token como query parameter
  - **Produção:** `https://vestra-erp.vercel.app/api/asaas/webhook?token=GFRX604l0msDhqbZr0v9VoA6`
  - **Sandbox (testes):** `https://seu-dominio.com/api/asaas/webhook?token=SEU_TOKEN_AQUI`
  - **Local (desenvolvimento com ngrok):** `https://xxxxx.ngrok.io/api/asaas/webhook?token=SEU_TOKEN_AQUI`
  - **Exemplo completo:** `https://vestra-erp.vercel.app/api/asaas/webhook?token=GFRX604l0msDhqbZr0v9VoA6`
- **E-mail para notificações:** Seu e-mail (para receber avisos de falhas)
- **Versão da API:** Selecione **v3**
- **Token de autenticação (opcional):** **DEIXE VAZIO** - O token já está incluído na URL acima como `?token=...`

**Eventos a selecionar:**

Marque os seguintes eventos:
- ✅ `PAYMENT_RECEIVED` - Pagamento recebido
- ✅ `PAYMENT_CONFIRMED` - Pagamento confirmado
- ✅ `PAYMENT_OVERDUE` - Pagamento vencido

### 4. Configurar token no `.env.local`

Adicione no seu `.env.local`:

```env
ASAAS_WEBHOOK_TOKEN=um_token_seguro_aqui_gerado_aleatoriamente
```

**Dica:** Gere um token seguro, por exemplo:
- Use um gerador online: https://randomkeygen.com/
- Ou gere via terminal: `openssl rand -hex 32`
- Ou use uma string aleatória longa

**IMPORTANTE:** Use o **mesmo token** na URL do webhook no painel do Asaas.

### 5. Exemplo de URL completa

**Formato correto:**
```
https://vestra-erp.vercel.app/api/asaas/webhook?token=GFRX604l0msDhqbZr0v9VoA6
```

**Onde:**
- `https://vestra-erp.vercel.app` = seu domínio
- `/api/asaas/webhook` = caminho do endpoint
- `?token=GFRX604l0msDhqbZr0v9VoA6` = token de autenticação (use o mesmo valor do `ASAAS_WEBHOOK_TOKEN` no `.env.local`)

**⚠️ ATENÇÃO:** 
- Cole a URL COMPLETA no campo "URL do Webhook"
- O campo "Token de autenticação" deve ficar VAZIO (já está na URL)
- Use o mesmo token que está em `ASAAS_WEBHOOK_TOKEN` no seu `.env.local`

### 6. Testar o webhook

Após criar:

1. O Asaas enviará um evento de teste
2. Verifique os logs do servidor para confirmar que recebeu
3. Faça um pagamento de teste e verifique se o evento chega

## Como funciona

Quando um evento acontece no Asaas (pagamento recebido, vencido, etc.):

1. **Asaas envia POST** para `/api/asaas/webhook?token=...`
2. **Vestra valida o token** (deve corresponder a `ASAAS_WEBHOOK_TOKEN`)
3. **Vestra identifica a organização** pelo `customer` ID do evento
4. **Vestra atualiza o status**:
   - `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED` → `billingStatus = 'active'` (libera acesso)
   - `PAYMENT_OVERDUE` → Verifica período de graça:
     - **Menos de 5 dias desde o vencimento:** `billingStatus = 'overdue'` (acesso mantido, apenas aviso)
     - **5 dias ou mais desde o vencimento:** `billingStatus = 'suspended'` (bloqueia acesso)

### Período de Graça

O sistema aplica um **período de graça de 5 dias** após o vencimento do boleto:

- **Dias 0-4 após vencimento:** Status `overdue` - Cliente ainda tem acesso, mas vê avisos
- **Dia 5+ após vencimento:** Status `suspended` - Acesso bloqueado até regularizar pagamento

**Total:** Cliente tem 3 dias para pagar o boleto (prazo normal) + 5 dias de tolerância = **8 dias totais** antes do bloqueio.

## Bloqueio de acesso

Quando `billingStatus = 'suspended'`:

- Usuários da organização são **redirecionados** para `/minha-conta` ao tentar acessar dashboard/POS
- Veem mensagem: "Acesso suspenso - Regularize suas pendências"
- Podem ver faturas e pagar, mas não acessam outras áreas

## Troubleshooting

**Webhook não está recebendo eventos:**

1. Verifique se a URL está correta no painel do Asaas
2. Verifique se o token na URL corresponde ao `ASAAS_WEBHOOK_TOKEN` no `.env.local`
3. Verifique os logs do servidor para erros
4. Para desenvolvimento local, use **ngrok** para expor o servidor:
   ```bash
   ngrok http 3000
   ```
   Use a URL do ngrok na configuração do webhook

**Eventos não estão atualizando o status:**

1. Verifique se o `customer` ID do evento corresponde ao `asaasCustomerId` da organização
2. Verifique os logs do webhook no servidor
3. Verifique se as colunas `billing_status` e `access_suspended_at` existem no banco (rode o SQL em `supabase-asaas-billing.sql`)
