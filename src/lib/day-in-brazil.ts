/**
 * Retorna o início e o fim do dia atual no fuso horário de São Paulo (America/Sao_Paulo).
 * Útil para fechamento de caixa e vendas "do dia" independente do TZ do servidor (ex.: UTC em produção).
 */
const TZ_BRAZIL = "America/Sao_Paulo";

function getTodayDatePartsInBrazil(now: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ_BRAZIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 1) - 1;
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 1);
  return { year, month, day };
}

/**
 * Início do dia (00:00:00.000) em São Paulo, em UTC (Date).
 */
export function getStartOfDayBrazil(now: Date = new Date()): Date {
  const { year, month, day } = getTodayDatePartsInBrazil(now);
  // 00:00 em São Paulo (UTC-3) = 03:00 UTC no mesmo dia (sem DST)
  return new Date(Date.UTC(year, month, day, 3, 0, 0, 0));
}

/**
 * Fim do dia (23:59:59.999) em São Paulo, em UTC (Date).
 */
export function getEndOfDayBrazil(now: Date = new Date()): Date {
  const { year, month, day } = getTodayDatePartsInBrazil(now);
  // 23:59:59.999 em São Paulo = 02:59:59.999 UTC do dia seguinte
  return new Date(Date.UTC(year, month, day + 1, 2, 59, 59, 999));
}
