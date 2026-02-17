# Fluxo NFC-e (Focus NFe) – Vestra

## 0. Modelo Conta Mestra (Vestra) + Sub-contas (clientes por CNPJ)

- **Conta Mestra (Vestra):** possui o Token de API (guardado no `.env` / Vercel).
- **Sub-contas (clientes):** identificadas pelo **CNPJ** (ou ID numérico na Focus).
- Cada cliente tem seu **certificado A1** e seu **CSC**. Na emissão usamos o **token da Vestra** e na requisição indicamos o **CNPJ** (sub-conta).

**Variáveis de ambiente:**

- `FOCUS_NFE_TOKEN` – token único (homolog e prod) **ou**
- `FOCUS_NFE_TOKEN_PROD` e `FOCUS_NFE_TOKEN_HOMOLOG` com `FOCUS_ENV=homologation` | `production`
- Sem `FOCUS_ENV`, usa homologação por padrão.

**Fluxo no backend (3 ações):**

1. **Cadastro da empresa (oculto ou no passo 1):** `registerCompanyInFocus(organizationId)` – POST `/v2/empresas` com nome, CNPJ, IE, IM, regime, endereço. Se 422 “empresa já cadastrada”, trata como sucesso.
2. **Upload do certificado:** envia .pfx em base64 para POST `/v2/empresas/{cnpj}/arquivo_certificado_a1`. Não guardamos o .pfx no banco.
3. **CSC:** PUT `/v2/empresas/{cnpj}` com `csc_nfce_producao`, `id_token_nfce_producao`, homologação; em seguida salvamos no banco (cscId, cscToken, isActive).

---

## 1. Variável na Vercel: o cliente consegue cadastrar a nota fiscal?

**Sim.** Ao adicionar **`FOCUS_NFE_TOKEN`** (ou `FOCUS_NFE_TOKEN_PROD` / `FOCUS_NFE_TOKEN_HOMOLOG` + `FOCUS_ENV`) no painel da Vercel (Settings → Environment Variables), o backend:

- Cadastra a empresa na Focus (por CNPJ) quando necessário.
- Envia o certificado para a sub-conta (CNPJ).
- Configura CSC na Focus e no banco.
- Emite NFC-e usando o token Vestra e o CNPJ da organização.

---

## 2. Fluxo final do cliente (lojista) no Vestra

Resumo do que o usuário final vê e faz.

### 2.1 Quem NÃO emite nota

- Não entra em **Configurações → Nota Fiscal (NFC-e)** (ou entra e não ativa).
- No PDV: finaliza venda → **só cupom não fiscal** (como antes).
- No cadastro de produtos: **não vê** a seção “Dados fiscais (NCM, CFOP, etc.)”.

### 2.2 Quem EMITE nota (optante)

1. **Configurações → Nota Fiscal (NFC-e) → “Configurar em 3 passos”**

2. **Passo 1 – Certificado digital A1**
   - Envia o arquivo **.pfx** (ou .p12) e a **senha**.
   - O Vestra envia isso para a API fiscal (não guarda arquivo nem senha).
   - Se a Focus aceitar, devolve um ID; o Vestra grava esse ID na configuração da empresa.
   - **Se o upload falhar** (ex.: endpoint só para revenda), o cliente pode:
     - Anexar o certificado no **painel da Focus NFe** (Serviços → Minhas Empresas → Editar → Anexar Certificado) e
     - Seguir no wizard só com CSC e ativação (certificado já fica na empresa da Focus).

3. **Passo 2 – Código CSC**
   - O cliente informa **ID do CSC** e **Código do CSC** (obtidos na SEFAZ do estado).
   - A tela mostra links por estado (“Onde pegar meu CSC?”) para as SEFAZ.
   - Clica em “Salvar e continuar”.

4. **Passo 3 – Dados da empresa**
   - O Vestra mostra **Razão social** e **CNPJ** (já cadastrados na organização).
   - O cliente só **confirma** e liga o interruptor **“Ativar emissão de NFC-e”**.
   - Opcional: “Confirmar e ativar emissão”.

5. **Depois de ativado**
   - No **PDV**, ao finalizar a venda:
     - A venda é gravada.
     - O sistema tenta emitir a NFC-e na Focus NFe (em background, sem travar o cupom).
     - Sempre aparece o **cupom não fiscal** para impressão.
     - Se a NFC-e for autorizada, o comprovante pode mostrar também o **link da NFC-e** (DANFE).
   - No **cadastro de produtos**, passa a aparecer a seção **“Dados fiscais (NFC-e)”** (NCM, Origem, CFOP, CEST) para preencher.

---

## 3. O que a documentação da Focus NFe indica e o que pode faltar

### 3.1 Autenticação e ambiente

- **Token:** um token por “conta”/empresa na Focus. Autenticação: HTTP Basic Auth (token como usuário, senha em branco). O Vestra está correto.
- **Ambiente:**
  - Homologação: `https://homologacao.focusnfe.com.br`
  - Produção: `https://api.focusnfe.com.br`  
  O Vestra usa isso e guarda por organização (`environment` no banco).

### 3.2 Certificado digital

- Na documentação/blog da Focus:
  - O certificado é vinculado **por empresa** no painel (Serviços → Minhas Empresas → Editar → Anexar Certificado).
  - Para **automatizar** o cadastro do certificado, a Focus orienta usar a **“API para revendas”** (não um endpoint genérico “upload certificado”).
- **Conclusão:** o endpoint **`POST /v2/certificados`** que o Vestra usa pode **não existir** na API padrão (pode ser só na API revenda). Se ao enviar o certificado no wizard der erro (404/400), o fluxo recomendado é:
  - Cadastrar/anexar o certificado **no painel da Focus NFe** na empresa que usa aquele token.
  - No Vestra, o cliente **pula o Passo 1** (ou o Vestra pode esconder o passo se já houver certificado na Focus) e preenche só **CSC** e **ativa** a emissão.

### 3.3 CSC (NFC-e)

- A documentação menciona campos como **csc_nfce_producao**, **csc_nfce_homologacao**, **id_token_nfce_*** no perfil da empresa.
- No Vestra enviamos na emissão algo no formato **`csc: { id, codigo }`**. Se a Focus usar outros nomes (ex.: `id_csc`, `token_csc`, ou CSC já configurado só no perfil da empresa), pode ser necessário ajustar o payload em `src/actions/invoice.ts` conforme a referência oficial da NFC-e da Focus.

### 3.4 Emissão NFC-e

- **Referência:** deve ser **única por token** (e não reutilizada após autorização). O Vestra usa `vestra-{saleId}`, o que atende.
- **NFC-e é síncrona:** a resposta da API já indica se foi autorizada ou não. O Vestra trata sucesso/erro e atualiza a venda (status, URL do DANFE, etc.).
- **Campos do JSON:** a documentação completa da Focus mostra muitos campos (ex.: NFe com `items` em inglês). Para **NFC-e** é importante conferir na documentação específica de NFC-e da Focus:
  - Nome do array de itens: **`itens`** (como no Vestra) ou **`items`**.
  - Nomes exatos de **CSC** e **certificado** (se forem enviados no body da emissão).
  - Outros campos obrigatórios por estado (emitente, endereço, etc.), caso a Focus não preencha tudo a partir do cadastro da empresa.

### 3.5 Um token = uma empresa (multi-tenant)

- Na doc: *“A referência deve ser única para **cada token de acesso**”* e há seção sobre **empresas** para quem *“irá administrar vários clientes que emitem notas”*.
- **Implicação:**
  - Se o Vestra tiver **uma única empresa** na Focus (um token no .env), só **essa** empresa emite NFC-e. Todos os “clientes” do Vestra estariam, na prática, usando a mesma empresa/cnpj na Focus (não é o caso típico de SaaS multi-tenant).
  - Para **várias empresas** (cada organização do Vestra = uma empresa diferente na SEFAZ), a Focus indica usar a **conta/API de revendas**: criar uma “empresa” por cliente, vincular certificado e CSC a cada uma, e emitir usando o token da revenda identificando a empresa. Hoje o Vestra **não** usa a API revenda; usa um único token global.
- **Resumo:** Com a variável na Vercel, **uma** empresa (a dona do token) consegue cadastrar e usar a nota fiscal no Vestra. Para vários CNPJs/empresas, seria necessário evoluir para o modelo revenda da Focus (criar empresa por organização e passar identificador na emissão).

---

## 4. Checklist prático para você (Vestra)

| Item | Status / Ação |
|------|----------------|
| `FOCUS_NFE_TOKEN` na Vercel | ✅ Necessário para o cliente “cadastrar” e emitir. |
| `FOCUS_NFE_ENV=production` (opcional) | ✅ Usar em produção quando for emitir notas reais. |
| Cupom sempre exibido após venda | ✅ Implementado (emissão não quebra o fluxo). |
| Seção fiscal no produto só para optante | ✅ Implementado (`getInvoiceEnabled`). |
| Upload de certificado (Passo 1) | ⚠️ Pode falhar se o endpoint for só revenda; ter plano B: certificado no painel Focus. |
| Nomes dos campos da NFC-e (itens, CSC, etc.) | ⚠️ Validar na doc oficial da Focus para NFC-e e ajustar payload se precisar. |
| Múltiplas empresas (multi-tenant) | ⚠️ Exige API revenda da Focus; hoje o fluxo é “um token = uma empresa”. |

---

## 5. Resposta direta

- **“Ao adicionar a variável diretamente na Vercel, o cliente conseguiria cadastrar a nota fiscal corretamente?”**  
  **Sim.** Com `FOCUS_NFE_TOKEN` (e, em produção, `FOCUS_NFE_ENV=production`) na Vercel, o fluxo de cadastro (wizard) e de emissão passa a funcionar para a **empresa associada a esse token**. O que pode precisar de ajuste é: (1) uso do upload de certificado (ou fazer só pelo painel Focus) e (2) nomes/campos exatos da NFC-e na documentação Focus.

- **Fluxo final do cliente:**  
  Configurações → NFC-e → 3 passos (certificado, CSC, confirmar dados e ativar) → depois disso, no PDV o cupom sempre sai e a NFC-e é tentada em background; no cadastro de produtos a parte fiscal só aparece para quem está com emissão ativada.

---

## 6. Cadastro de empresa via API (modelo SaaS / revenda)

**Sim, dá para cadastrar os dados da empresa via API.** A tela que você viu no painel (“Minhas Empresas” → “Nova empresa” com Identificação, Contato, Endereço, Certificado, TOKENS, Documentos Fiscais) tem equivalente na **API de Revenda v2** da Focus NFe.

### O que a API de Revenda oferece

- **Criar empresa** (equivalente a “Nova empresa” no painel).
- **Consultar, alterar, excluir e paginar** empresas.
- Uso **só em produção**; para simular, usar `dry_run=1` na URL.
- **Token específico de revenda**, fornecido pela equipe Focus NFe (diferente do token normal de emissão).
- Comunicação **apenas em JSON**.

Documentação: [Focus NFe – API de Revenda](https://focusnfe.com.br/doc/#revenda_revenda).  
Fórum: [Cadastro de Empresa - API de Revenda](https://forum.focusnfe.com.br/t/cadastro-de-empresa-api-de-revenda/71).

### Como funciona para SaaS (Vestra)

No modelo **white label**, cada **organização** do Vestra = uma **empresa** na Focus NFe (um CNPJ, um certificado, um CSC). O fluxo seria:

1. **Contrato com a Focus NFe**  
   Você (Vestra) contrata a API em modo **revenda** e recebe um **token de revenda** (guardado no .env, ex.: `FOCUS_NFE_REVENDA_TOKEN`).

2. **Quando o cliente ativa NFC-e no wizard**  
   Em vez de só guardar certificado/CSC no seu banco:
   - O Vestra chama a **API de Revenda** para **criar uma empresa** na Focus NFe com:
     - CNPJ, Razão Social, Nome Fantasia (da organização).
     - Contato, Endereço (se tiver no Vestra).
     - Regime Tributário (perguntar no wizard ou usar padrão).
     - Certificado A1 (arquivo .pfx + senha enviados no body da requisição, conforme doc da revenda).
     - Depois de criada a empresa, configurar CSC (se a API revenda tiver endpoint para isso) ou o cliente informa no painel Focus uma vez.
   - A Focus devolve um **identificador da empresa** (e, dependendo do contrato, **tokens por empresa**).
   - O Vestra grava esse **ID (e/ou token)** em `invoice_settings` (ex.: `focus_company_id` ou `focus_token`) vinculado à organização.

3. **Na emissão da NFC-e**  
   Para cada venda:
   - O Vestra identifica a **organização** da venda.
   - Usa o **token dessa empresa** (se a Focus devolver token por empresa) **ou** o token de revenda + **ID da empresa** na chamada de emissão (conforme o que a API da Focus exigir).
   - Assim cada loja emite nota no próprio CNPJ, sem o cliente precisar abrir o painel da Focus.

4. **O que o cliente vê**  
   Só o wizard do Vestra: certificado, senha, CSC, confirmar dados e ativar. Toda a “Nova empresa” na Focus é preenchida por você via API; o cliente não acessa “Minhas Empresas” na Focus.

### Resumo

| Pergunta | Resposta |
|----------|----------|
| Dá para cadastrar empresa via API? | **Sim**, pela **API de Revenda v2** (criar/consultar/alterar/excluir empresas). |
| O formulário “Nova empresa” do painel vira API? | Sim. Os campos (CNPJ, Razão Social, Certificado, Contato, Endereço, Regime, TOKENS, etc.) são enviados em JSON nos endpoints de revenda. |
| Como fica para o Vestra em SaaS? | Um token de **revenda** no .env; a cada cliente que ativa NFC-e, o Vestra **cria uma empresa** na Focus via API e guarda o ID/token; na emissão usa esse vínculo para emitir no CNPJ correto. |
| Próximo passo | Pedir à Focus NFe o **token de revenda** e a **documentação exata** da API de Revenda v2 (endpoints, campos obrigatórios para criar empresa e anexar certificado, e como informar a empresa na emissão da NFC-e). |
