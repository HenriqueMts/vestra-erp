/**
 * Cria pasta out/ com um index.html que redireciona para o Vestra na web.
 * O app desktop é só uma janela que abre a URL (Vercel). Em qualquer PC:
 * instale o Vestra desktop e use — não precisa rodar nada localmente.
 * Para dev local: VESTRA_APP_URL=http://localhost:3000 npm run build:tauri
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "out");
const url = process.env.VESTRA_APP_URL || "https://vestra.app.br/login";

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${url}" />
  <title>Vestra - Redirecionando</title>
</head>
<body>
  <p>Redirecionando para o Vestra...</p>
  <script>window.location.replace("${url}");</script>
</body>
</html>`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), html);
console.log("out/index.html criado (redireciona para " + url + ")");
