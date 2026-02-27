/**
 * Build do app desktop Tauri com assinatura do updater.
 * Lê a chave privada de vestra.key na raiz do projeto e roda o build.
 * Uso: node scripts/build-desktop-signed.js  ou  npm run desktop:build:signed
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const projectRoot = path.resolve(__dirname, '..');
const keyPath = path.join(projectRoot, 'vestra.key');

if (!fs.existsSync(keyPath)) {
  console.error('Arquivo vestra.key não encontrado na raiz do projeto.');
  console.error('Gere com: npx tauri signer generate -w vestra.key');
  process.exit(1);
}

const keyContent = fs.readFileSync(keyPath, 'utf8').trim();
// Primeira linha = chave privada (a segunda seria a pública se o arquivo tiver as duas)
const privateKey = keyContent.split(/\r?\n/)[0].trim();
if (!privateKey) {
  console.error('vestra.key está vazio ou em formato inesperado.');
  process.exit(1);
}

process.env.TAURI_SIGNING_PRIVATE_KEY = privateKey;

const result = spawnSync('npm', ['run', 'desktop:build'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
