// Dashboard (Sprint 18): períodos e métricas derivadas dos números que o banco
// devolve (função quote_dashboard). Funções puras, testadas.

const DAY_MS = 86_400_000

/** Períodos do seletor (?periodo=…). O padrão é o primeiro com `default`. */
export const DASHBOARD_PERIODS = Object.freeze([
  { value: "30d", label: "30 dias", days: 30 },
  { value: "90d", label: "90 dias", days: 90 },
  { value: "12m", label: "12 meses", days: 365, default: true },
  { value: "tudo", label: "Tudo", days: null },
])

const DEFAULT_PERIOD = DASHBOARD_PERIODS.find((period) => period.default)

/** Valor da URL → período válido (qualquer outra coisa → o padrão). */
export function parsePeriod(value) {
  return DASHBOARD_PERIODS.find((period) => period.value === value) ?? DEFAULT_PERIOD
}

/** Início do período (Date), ou null para "Tudo". */
export function periodSince(period, now = new Date()) {
  return period.days === null ? null : new Date(now.getTime() - period.days * DAY_MS)
}

/** "nos últimos 30 dias" / "desde o início", para os textos de apoio. */
export function describePeriod(period) {
  return period.days === null ? "desde o início" : `nos últimos ${period.label}`
}

/**
 * Números do banco → métricas do painel.
 * - conversão = aprovadas ÷ enviadas (as que chegaram ao cliente; canceladas
 *   fora), em fração 0–1; sem enviadas → null ("—", não 0%);
 * - ticket médio = valor aprovado ÷ aprovadas, em centavos inteiros; sem
 *   aprovadas → null.
 * @param {{ total: number, by_status: Record<string, number>, reached: number,
 *   reached_value_cents: number, approved_value_cents: number, open_value_cents: number }} raw
 */
export function dashboardMetrics(raw) {
  const byStatus = raw.by_status
  const approved = byStatus.approved
  return {
    total: raw.total,
    byStatus,
    reached: raw.reached,
    approved,
    conversion: raw.reached > 0 ? approved / raw.reached : null,
    reachedValueCents: raw.reached_value_cents,
    approvedValueCents: raw.approved_value_cents,
    openCount: byStatus.sent + byStatus.viewed,
    openValueCents: raw.open_value_cents,
    averageTicketCents: approved > 0 ? Math.round(raw.approved_value_cents / approved) : null,
  }
}

const countFormatter = new Intl.NumberFormat("pt-BR")

/** 1 → "1 proposta", 1234 → "1.234 propostas". */
export function countLabel(count, singular, plural) {
  return `${countFormatter.format(count)} ${count === 1 ? singular : plural}`
}
