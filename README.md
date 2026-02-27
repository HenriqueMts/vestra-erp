# Vestra ERP

Sistema de gestão empresarial para lojas de **atacado e varejo**, com foco em moda. Controle de estoque, PDV, clientes, equipe e relatórios em uma única plataforma.

**Produção:** [vestra.app.br](https://vestra.app.br)

---

## Sobre o projeto

O Vestra ERP permite que empresas gerenciem múltiplas lojas, cadastrem produtos com variantes (cor e tamanho), realizem vendas no ponto de venda (PDV), acompanhem o fluxo de caixa e acessem dashboards e relatórios. Inclui integração com cobrança (Asaas) e emissão de notas fiscais (Focus NFe), além de versão desktop instalável (Tauri).

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **PDV** | Frente de caixa com busca por produto/SKU, seleção de variantes, formas de pagamento (PIX, crédito, débito, dinheiro) e vínculo com cliente |
| **Produtos e estoque** | Cadastro com categorias, cores, tamanhos, imagens e controle de estoque por loja |
| **Multi-lojas** | Organizações com várias unidades, estoque independente e troca de loja no PDV |
| **CRM** | Cadastro de clientes (PF/PJ), CPF/CNPJ e histórico de vendas |
| **Equipe** | Membros por organização com perfis (owner, manager, seller) e convites por e-mail |
| **Dashboard** | Visão geral de vendas, caixa e operação |
| **Fechamento de caixa** | Registro e impressão de fechamento |
| **Cobrança** | Integração Asaas para assinaturas e status de pagamento por organização |
| **Notas fiscais** | Integração Focus NFe para emissão (homologação e produção) |
| **App desktop** | Versão instalável (Windows e outros) que abre o sistema na web |

---

## Stack tecnológica

- **Frontend:** [Next.js](https://nextjs.org) 16 (App Router), [React](https://react.dev) 19, [Tailwind CSS](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com), [Recharts](https://recharts.org)
- **Auth e storage:** [Supabase](https://supabase.com) (Auth + Storage)
- **Banco de dados:** PostgreSQL com [Drizzle ORM](https://orm.drizzle.team)
- **Formulários e validação:** React Hook Form, Zod
- **Integrações:** Asaas (cobrança), Focus NFe (notas fiscais)
- **Desktop:** [Tauri](https://tauri.app) 2 (app nativo que carrega a URL do sistema)

---

## Pré-requisitos

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) / npm / yarn
- PostgreSQL (local ou Supabase)
- Conta [Supabase](https://supabase.com) e, opcionalmente, Asaas e Focus NFe

---

## Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/vestra-erp.git
cd vestra-erp

# Instale as dependências
npm install

# Copie o exemplo de variáveis de ambiente
cp .env.example .env.local

# Edite .env.local com suas chaves e URLs
```

Configure as variáveis em `.env.local` conforme o `.env.example`. As obrigatórias para rodar em desenvolvimento são:

- `NEXT_PUBLIC_APP_URL` – URL do app (ex.: `http://localhost:3000`)
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` – connection string do PostgreSQL
- `SUPABASE_SERVICE_ROLE_KEY` – para operações server-side no Supabase

Asaas e Focus NFe são opcionais para uso local.

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe o servidor de desenvolvimento em [http://localhost:3000](http://localhost:3000) |
| `npm run build` | Build de produção (Next.js) |
| `npm run start` | Sobe o servidor em modo produção (após `build`) |
| `npm run lint` | Executa o linter |
| `npm run desktop:dev` | Sobe o Next e abre a janela do app desktop (Tauri) |
| `npm run desktop:build` | Gera o instalador do app desktop |

---

## Variáveis de ambiente

Consulte o arquivo **`.env.example`** para a lista completa. Resumo:

- **Públicas** (enviadas ao cliente; não use para segredos):  
  `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Secretas** (apenas servidor):  
  `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `FOCUS_NFE_TOKEN*`, `VESTRA_ADMIN_EMAILS`

Em produção (ex.: Vercel), defina `NEXT_PUBLIC_APP_URL=https://vestra.app.br` para redirects de autenticação e links funcionarem corretamente.

---

## App desktop (Tauri)

O app desktop é uma janela que carrega o Vestra na web. O usuário não precisa rodar Node nem servidor local; basta ter o instalador e internet.

- **Desenvolvimento:** `npm run desktop:dev` — inicia o Next e abre a janela Tauri em localhost.
- **Build do instalador:** `npm run desktop:build`. O instalador é gerado em `src-tauri/target/release/bundle/`. Por padrão o app abre **https://vestra.app.br/login**. Para usar outra URL: `VESTRA_APP_URL=https://sua-url npm run build:tauri` antes de `npm run desktop:build`.

### Verificador de atualizações

Ao abrir o app, o Tauri consulta a API de updates (`/api/tauri-update/...`). Se houver versão mais nova, é exibida uma janela com as notas e um botão para **Atualizar agora**; o instalador é baixado e executado e o app é fechado.

#### Configurar a chave de assinatura (uma vez)

A assinatura garante que só instaladores gerados por você sejam aceitos na atualização. Você gera um par de chaves: a **pública** vai no código; a **privada** fica só com você e é usada na hora do build.

**Passo 1 – Gerar o par de chaves**

No terminal, na pasta do projeto:

```bash
npx tauri signer generate -w vestra.key
```

- O comando cria o arquivo `vestra.key` na pasta atual (ou use um caminho, ex.: `C:\Users\henri\.tauri\vestra.key`).
- **Guarde esse arquivo em local seguro e faça backup.** Quem tiver a chave privada pode assinar atualizações em nome do app.
- O comando também **imprime no terminal** duas linhas longas (base64): uma começa com algo como `dW50...` (chave privada) e outra é a **chave pública**.

**Passo 2 – Colocar a chave pública no projeto**

1. Abra `src-tauri/tauri.conf.json`.
2. Encontre `"pubkey": "REPLACE_WITH_PUBLIC_KEY_AFTER_TAURI_SIGNER_GENERATE"`.
3. Substitua pelo valor da **chave pública** que o comando mostrou (a linha inteira, sem espaços extras). Exemplo:

   `"pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmltdW0tc2l6ZSBra..."

**Passo 3 – Usar a chave privada no build**

O Tauri precisa da chave **privada** só na hora de gerar o instalador, para assinar o arquivo. Você pode passar de duas formas:

**Opção A – Variável de ambiente com o conteúdo da chave**

- Abra o arquivo `vestra.key` (ou o caminho que você usou em `-w`). Ele tem duas linhas: a primeira é a chave privada.
- No terminal, **antes** de rodar o build, defina a variável com esse conteúdo:

  **PowerShell (Windows):**
  ```powershell
  $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw -Path ".\vestra.key" | ForEach-Object { ($_ -split "`n")[0] }
  npm run desktop:build
  ```

  **Git Bash / Linux / macOS:**
  ```bash
  export TAURI_SIGNING_PRIVATE_KEY=$(head -1 vestra.key)
  npm run desktop:build
  ```

**Opção B – Variável com o caminho do arquivo (onde suportado)**

Algumas versões do Tauri aceitam o caminho do arquivo em vez do conteúdo. Ex. (PowerShell):

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\caminho\completo\para\vestra.key"
npm run desktop:build
```

Se der erro de “private key not found”, use a Opção A (conteúdo da chave).

**Importante:** não commite o arquivo `vestra.key` no Git. Coloque `vestra.key` (e o caminho que usar) no `.gitignore`.

---

**Publicar uma nova versão:**

1. Aumentar a versão em `src-tauri/tauri.conf.json` (e opcionalmente em `package.json`).
2. Build com a chave configurada (Passo 3 acima).
3. Enviar para o servidor:
   - O instalador (ex.: `.nsis.zip` no Windows) para a URL que o cliente vai baixar.
   - O arquivo `.sig` gerado no mesmo diretório do instalador.
4. No servidor (Vercel/backend), definir:
   - `TAURI_UPDATE_VERSION` = nova versão (ex.: `0.2.0`)
   - `TAURI_UPDATE_URL_<TARGET>_<ARCH>` = URL do instalador (ex.: `TAURI_UPDATE_URL_WINDOWS_X86_64`)
   - `TAURI_UPDATE_SIGNATURE_<TARGET>_<ARCH>` = conteúdo do `.sig`

Exemplo de variáveis no `.env` do servidor: ver seção "Atualizações do app desktop" no `.env.example`.

---

## Segurança

- No desktop, o usuário tem o mesmo acesso que no navegador (DevTools, rede, código do front). O app carrega a mesma URL (vestra.app.br); **segredos permanecem apenas no servidor**.
- **Nunca** use o prefixo `NEXT_PUBLIC_` para chaves ou tokens; essas variáveis são enviadas ao cliente.
- A proteção dos dados no Supabase depende do **RLS (Row Level Security)**; a anon key é pública por design.
- Rotas e Server Actions sensíveis devem sempre validar sessão/autenticação no servidor.

---

## Deploy

O projeto está preparado para deploy na [Vercel](https://vercel.com). Configure as variáveis de ambiente no painel do projeto e faça o deploy a partir do repositório Git. Para produção, use `NEXT_PUBLIC_APP_URL=https://vestra.app.br` (ou o domínio que utilizar).

---

## Estrutura do repositório

```
vestra-erp/
├── app/                    # Rotas e páginas (Next.js App Router)
│   ├── (auth)/             # Login, callback OAuth
│   ├── (dashboard)/        # Dashboard, configurações, CRM, estoque, etc.
│   ├── (pos)/              # PDV e seleção de loja
│   └── api/                # Rotas de API (upload, webhooks)
├── src/
│   ├── actions/            # Server Actions
│   ├── components/         # Componentes React
│   ├── db/                 # Schema e cliente Drizzle
│   ├── lib/                # Utilitários (Asaas, Focus, auth, etc.)
│   └── utils/              # Supabase (client/server/admin), validadores
├── src-tauri/              # Projeto Tauri (app desktop)
├── scripts/                # Scripts de build (ex.: fallback para desktop)
├── .env.example            # Exemplo de variáveis de ambiente
└── README.md
```

---

## Licença e contato

Projeto privado. Para dúvidas ou suporte: **henrique.mts@outlook.com.br**.
