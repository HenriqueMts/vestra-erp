import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint de atualização do app desktop (Tauri).
 * O cliente chama: GET /api/tauri-update/{target}/{arch}/{current_version}
 * - target: windows | darwin | linux
 * - arch: x86_64 | aarch64 | i686 | armv7
 * - current_version: versão instalada (ex: 0.1.0)
 *
 * Resposta: 204 No Content se não houver atualização; 200 OK + JSON do manifest se houver.
 * Variáveis de ambiente (exemplo):
 *   TAURI_UPDATE_VERSION=0.1.1
 *   TAURI_UPDATE_URL_WINDOWS_X86_64=https://vestra.app.br/downloads/Vestra-ERP_0.1.1_x64-setup.nsis.zip
 *   TAURI_UPDATE_SIGNATURE_WINDOWS_X86_64=conteúdo do .sig
 * (e equivalentes para outros target/arch quando existirem)
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ target: string; arch: string; current_version: string }> },
) {
  const { target, arch, current_version } = await context.params;
  const latest = process.env.TAURI_UPDATE_VERSION?.trim();

  if (!latest) {
    return NextResponse.json(
      { error: "TAURI_UPDATE_VERSION não configurada" },
      { status: 500 },
    );
  }

  if (compareVersions(current_version, latest) >= 0) {
    return new NextResponse(null, { status: 204 });
  }

  const key = `${target}-${arch}`.toUpperCase().replace(/-/g, "_");
  const url = process.env[`TAURI_UPDATE_URL_${key}`];
  const signature = process.env[`TAURI_UPDATE_SIGNATURE_${key}`];

  if (!url || !signature) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({
    version: latest,
    notes: process.env.TAURI_UPDATE_NOTES || `Atualização ${latest}`,
    pub_date: process.env.TAURI_UPDATE_PUB_DATE || new Date().toISOString(),
    url,
    signature,
  });
}

function compareVersions(a: string, b: string): number {
  const na = parseVersion(a);
  const nb = parseVersion(b);
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const va = na[i] ?? 0;
    const vb = nb[i] ?? 0;
    if (va !== vb) return va - vb;
  }
  return 0;
}

function parseVersion(v: string): number[] {
  const s = v.replace(/^v/i, "").trim();
  return s.split(".").map((n) => parseInt(n, 10) || 0);
}
