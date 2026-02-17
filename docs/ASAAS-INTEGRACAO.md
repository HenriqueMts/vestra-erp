# Integração Asaas – Cobrança de planos (Vestra)

## 0. Configuração (variáveis de ambiente)

No `.env.local` (nunca commitar a chave):

```env
# Chave da API Asaas (Integrações > Chaves de API no painel Asaas)
ASAAS_API_KEY=sua_chave_aqui

# Ambiente: sandbox ou production
ASAAS_ENV=production

# Opcional: emails que veem a gestão de clientes (lista de orgs + "Cadastrar no Asaas")
# Separados por vírgula, sem espaços
VESTRA_ADMIN_EMAILS=seu@email.com
```

Reinicie o servidor após alterar o `.env.local`.

---

## 1. Modelo de negócio

- **Planos sem valor fixo:** o valor é acordado entre você (Vestra) e cada cliente.
- **Após o acordo:** o valor mensal é definido e a cobrança é feita em **boleto**, todo mês.
- **Na conta do cliente:** ele vê os boletos, datas de vencimento e valores acordados.
- **Ajuste de valor:** o valor é definido **no momento da criação** da assinatura (acordo); para alterar depois, atualiza-se a assinatura no Asaas (afeta só cobranças futuras).

---

## 2. Como o Asaas se encaixa

| Conceito Asaas | No Vestra |
|----------------|-----------|
| **Conta Asaas** | Sua conta (Vestra). Uma API key no `.env`. |
| **Customer (cliente)** | Cada **organização** que usa o Vestra (um cliente de cobrança por empresa). |
| **Subscription (assinatura)** | O “plano” acordado: valor mensal + boleto recorrente. |
| **Payment (cobrança)** | Cada boleto mensal gerado pela assinatura. |

Fluxo resumido:

1. **Cadastrar o cliente no Asaas** (uma vez por organização): `POST /v3/customers` com nome, CPF/CNPJ, email, etc. Guardar o `id` (ex.: `cus_xxx`) na organização.
2. **Definir o acordo (valor + vencimento):** criar uma **assinatura** com boleto mensal: `POST /v3/subscriptions` com `customer`, `value` (valor acordado), `billingType: "BOLETO"`, `cycle: "MONTHLY"`, `nextDueDate` (ex.: dia 10 do mês). Guardar o `id` da assinatura (ex.: `sub_xxx`).
3. **Boletos mensais:** o Asaas gera as cobranças automaticamente todo mês (a partir do `nextDueDate` e do ciclo MONTHLY).
4. **Na conta do usuário:** listar cobranças com `GET /v3/payments?customer={asaas_customer_id}` (ou `GET /v3/subscriptions/{id}/payments`) e exibir: descrição, vencimento, valor, status, link do boleto (`bankSlipUrl`).

---

## 3. Ajuste de valores

- **Na criação:** ao criar a assinatura você envia o `value` (valor acordado) e o `nextDueDate` (ex.: dia 10). Esse é o “ajuste no momento da criação”.
- **Depois:** para mudar o valor ou o dia de vencimento, use `PUT /v3/subscriptions/{id}`. Por padrão isso afeta só as **próximas** cobranças; para atualizar também cobranças já geradas e pendentes, use `updatePendingPayments: true`.

Assim, “ajustar os valores no momento da criação” = preencher `value` (e opcionalmente `nextDueDate`) no `POST /v3/subscriptions` quando você formaliza o acordo.

---

## 4. Endpoints principais (API Asaas v3)

- **Base URL:** produção `https://api.asaas.com`, sandbox `https://api-sandbox.asaas.com`.
- **Autenticação:** header `access_token: $ASAAS_API_KEY`.

| Ação | Método | Endpoint | Uso no Vestra |
|------|--------|----------|----------------|
| Criar cliente | POST | `/v3/customers` | Uma vez por organização (nome, document, email, etc.). |
| Criar assinatura | POST | `/v3/subscriptions` | Ao fechar acordo: valor, boleto, MONTHLY, nextDueDate. |
| Atualizar assinatura | PUT | `/v3/subscriptions/{id}` | Alterar valor/dia (futuras ou pendentes). |
| Listar cobranças do cliente | GET | `/v3/payments?customer={id}` | Tela “Minha conta / Faturas” do cliente. |
| Listar cobranças da assinatura | GET | `/v3/subscriptions/{id}/payments` | Alternativa para listar só boletos do plano. |

Payload mínimo para assinatura mensal em boleto:

```json
{
  "customer": "cus_xxxx",
  "billingType": "BOLETO",
  "nextDueDate": "2025-03-10",
  "value": 199.90,
  "cycle": "MONTHLY",
  "description": "Vestra - Plano mensal"
}
```

---

## 4.1 Formas de recebimento do Asaas: Boleto e PIX

O Asaas oferece várias formas de pagamento por cobrança:

| Forma        | Descrição |
|-------------|-----------|
| **BOLETO** | Boleto bancário. O cliente paga no banco, lotérica ou app. O Asaas gera o PDF e o link do boleto. |
| **PIX**    | Pagamento instantâneo via PIX (QR Code dinâmico ou chave). O valor cai na sua conta na hora. |
| **CREDIT_CARD** | Cartão de crédito (exige conta 100% aprovada no Asaas). |
| **DEBIT_CARD**  | Cartão de débito. |
| **UNDEFINED**   | Na **cobrança única** (payment link), o cliente **escolhe** o método (boleto, PIX, cartão etc.). |

### Boleto com possibilidade de PIX

- **Na mesma cobrança:** quando você cria uma cobrança com **boleto** (`billingType: "BOLETO"`), o Asaas gera o boleto e, no **painel e no link de pagamento**, o cliente costuma ver também a opção de **pagar com PIX** (QR Code / copia e cola) para aquela mesma cobrança. Ou seja: uma cobrança em boleto pode ser paga por boleto **ou** por PIX, conforme a interface que o Asaas exibe.
- **Assinaturas:** na API, ao criar assinatura você informa um único `billingType` (ex.: `"BOLETO"`). As cobranças mensais são geradas como boleto; o cliente acessa pelo link da cobrança (`invoiceUrl` / `bankSlipUrl`) e, na tela do Asaas, pode pagar por boleto ou PIX quando o Asaas oferecer essa opção.

### Como usar corretamente

1. **Sua conta Asaas**  
   Cadastre e ative **boleto** e **PIX** no painel (Configurações / Formas de pagamento). Para PIX, cadastre uma chave PIX para receber.

2. **Cobrança só boleto (com PIX na tela do Asaas)**  
   - Crie a cobrança ou assinatura com `billingType: "BOLETO"`.  
   - Envie ao cliente o link da cobrança (`invoiceUrl` ou `bankSlipUrl`).  
   - No link, o Asaas mostra o boleto e, quando disponível, a opção de pagar com PIX na mesma tela. Não é necessário criar duas cobranças.

3. **Deixar o cliente escolher (cobrança avulsa)**  
   - Em **payment links** (cobrança avulsa), use `billingType: "UNDEFINED"` para o cliente poder escolher boleto, PIX ou cartão.  
   - Em **assinaturas** (recorrentes), use `billingType: "BOLETO"` (ou `"PIX"` se quiser só PIX); a flexibilidade boleto+PIX na mesma cobrança vem da tela de pagamento do Asaas.

4. **Exibir na tela “Plano de assinatura”**  
   - Use o **mesmo** link que você já exibe: `bankSlipUrl` ou `invoiceUrl`. Por esse link o cliente vê o boleto e pode pagar por PIX se o Asaas mostrar a opção. Não é preciso mudar a integração para “ativar” PIX no boleto.

Resumo: **em cobranças em boleto, o Asaas já pode oferecer pagamento por PIX na mesma cobrança**; basta enviar o link da cobrança ao cliente e ter PIX ativo na sua conta Asaas.

---

## 5. Proposta de implementação no Vestra

### 5.1 Dados no banco (schema)

Guardar por organização o que veio do Asaas e o que você definiu no acordo:

- **`asaas_customer_id`** – ID do cliente no Asaas (após `POST /v3/customers`).
- **`asaas_subscription_id`** – ID da assinatura (após `POST /v3/subscriptions`).
- **`plan_value_cents`** – Valor mensal acordado em centavos (ex.: 19990 = R$ 199,90).
- **`plan_billing_day`** – Dia do vencimento (1–28), opcional.

Duas opções:

- **A) Colunas na tabela `organizations`:**  
  `asaas_customer_id`, `asaas_subscription_id`, `plan_value_cents`, `plan_billing_day`.
- **B) Tabela separada `billing_subscriptions`:**  
  `organization_id`, `asaas_customer_id`, `asaas_subscription_id`, `monthly_value_cents`, `billing_day`, `status`, `started_at`.

A **B** é mais flexível (histórico, múltiplos planos no futuro). A **A** é mais simples para “um plano por organização”.

### 5.2 Variáveis de ambiente

```env
ASAAS_API_KEY=sua_chave_api
ASAAS_ENV=sandbox
```

- `sandbox`: `https://api-sandbox.asaas.com`
- `production`: `https://api.asaas.com`

### 5.3 Server actions (backend)

1. **`createAsaasCustomer(organizationId)`**  
   Busca organização (nome, document, etc.), chama `POST /v3/customers`, grava `asaas_customer_id` e retorna o id.

2. **`createOrUpdateSubscription(organizationId, { valueReais, billingDay })`**  
   Se não existir cliente no Asaas, chama `createAsaasCustomer`.  
   Monta `nextDueDate` (ex.: próximo dia `billingDay`).  
   Se já existe assinatura: `PUT /v3/subscriptions/{id}` com novo valor/dia (e `updatePendingPayments` se quiser).  
   Se não existe: `POST /v3/subscriptions` com valor e dia.  
   Atualiza no banco `asaas_subscription_id`, `plan_value_cents`, `plan_billing_day`.

3. **`listOrganizationPayments(organizationId)`**  
   Usa `asaas_customer_id` e chama `GET /v3/payments?customer=...`.  
   Retorna lista para a tela do cliente: vencimento, valor, status, `bankSlipUrl`, etc.

4. **`getSubscriptionStatus(organizationId)`** (opcional)  
   `GET /v3/subscriptions/{id}` para mostrar status da assinatura (ativa, cancelada, etc.).

### 5.4 Onde usar no produto

- **Você (admin Vestra):** ao fechar acordo com um cliente, em algum fluxo “Definir plano / Ativar cobrança”:
  - Informar valor mensal e (opcional) dia de vencimento.
  - Chamar `createOrUpdateSubscription(organizationId, { valueReais, billingDay })`.
  - Assim o valor é “ajustado no momento da criação” e os boletos passam a ser gerados mensalmente.

- **Cliente (dono da organização):** área “Minha conta” ou “Faturas”:
  - Chamar `listOrganizationPayments(organizationId)`.
  - Exibir tabela/cards: descrição, vencimento, valor, status (Pendente, Pago, Vencido), link para boleto (`bankSlipUrl`).

### 5.5 Webhooks (recomendado)

Configurar no painel Asaas eventos como `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, etc., e um endpoint no Vestra para:
- Atualizar status de cobrança no seu lado (se guardar cópia).
- Enviar email ou notificação ao cliente (opcional).

---

## 6. Resumo do fluxo

1. Cliente assina o Vestra e você combina valor e dia de vencimento.
2. No Vestra você dispara a criação/atualização da assinatura com esse valor (e dia).
3. Asaas gera boleto todo mês; o cliente vê na tela “Faturas” os boletos, vencimentos e valores acordados.
4. Ajustes de valor são feitos na criação da assinatura ou depois via atualização da assinatura (valor e dia definidos por você no acordo).

Se quiser, no próximo passo podemos desenhar o schema exato (colunas ou tabela `billing_subscriptions`) e os nomes das actions/páginas no seu código (ex.: onde fica “Definir plano” e “Minha conta / Faturas”).
