// Datas de calendário (sem hora), como a validade de um orçamento, trafegam
// como texto ISO "AAAA-MM-DD": é o formato do <input type="date"> e da coluna
// DATE do Postgres. As contas usam meia-noite em UTC, então não há fuso nem
// horário de verão no meio. Só "hoje" depende do fuso: o do Brasil (São Paulo).

export const APP_TIME_ZONE = "America/Sao_Paulo"

const DAY_MS = 86_400_000
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const todayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Data ISO → milissegundos da meia-noite UTC, ou NaN se não for uma data real. */
function toUtcMs(iso) {
  const match = ISO_DATE_RE.exec(String(iso))
  if (!match) return NaN
  const [, year, month, day] = match.map(Number)
  const ms = Date.UTC(year, month - 1, day)
  // Date.UTC "conserta" datas como 31/02; aqui elas são inválidas.
  const date = new Date(ms)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? ms : NaN
}

function fromUtcMs(ms) {
  return new Date(ms).toISOString().slice(0, 10)
}

/** "2026-10-07" é uma data de calendário válida? (rejeita "2026-02-31") */
export function isIsoDate(value) {
  return !Number.isNaN(toUtcMs(value))
}

/** Hoje no fuso de São Paulo, como "AAAA-MM-DD". */
export function todayIso(now = new Date()) {
  const parts = Object.fromEntries(todayFormatter.formatToParts(now).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** "2026-10-07" + 15 → "2026-10-22" */
export function addDaysIso(iso, days) {
  const ms = toUtcMs(iso)
  if (Number.isNaN(ms)) throw new RangeError(`Data inválida: ${String(iso)}`)
  return fromUtcMs(ms + days * DAY_MS)
}

/** Dias de `from` até `to` (negativo se `to` for antes). NaN se alguma for inválida. */
export function daysBetweenIso(from, to) {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS)
}

const longFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

/** "2026-10-22" → "Quinta-feira, 22 de outubro de 2026" ("" se inválida). */
export function formatIsoDateLong(iso) {
  const ms = toUtcMs(iso)
  if (Number.isNaN(ms)) return ""
  const text = longFormatter.format(ms)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const shortFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

/** "2026-10-22" → "22 de out. de 2026" ("" se inválida). */
export function formatIsoDateShort(iso) {
  const ms = toUtcMs(iso)
  return Number.isNaN(ms) ? "" : shortFormatter.format(ms)
}

/** 0 → "hoje", 1 → "amanhã", 15 → "em 15 dias", -1 → "ontem", -3 → "há 3 dias". */
export function describeDaysFromToday(days) {
  if (days === 0) return "hoje"
  if (days === 1) return "amanhã"
  if (days === -1) return "ontem"
  return days > 0 ? `em ${days} dias` : `há ${-days} dias`
}

// Momentos (data + hora), como "quando o rascunho foi guardado". Exibidos no fuso de São Paulo.
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE })
const dayMonthFormatter = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: APP_TIME_ZONE })
const dayMonthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
})

/**
 * Momento → "hoje às 14:32", "ontem às 09:05", "3 de out. às 18:40" (outro ano:
 * "3 de out. de 2025 às 18:40"), no fuso de São Paulo. "" se inválido.
 */
export function formatMomentRelative(value, now = new Date()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const time = timeFormatter.format(date)
  const day = todayIso(date)
  const today = todayIso(now)
  const days = daysBetweenIso(day, today)
  if (days === 0) return `hoje às ${time}`
  if (days === 1) return `ontem às ${time}`
  const formatter = day.slice(0, 4) === today.slice(0, 4) ? dayMonthFormatter : dayMonthYearFormatter
  return `${formatter.format(date)} às ${time}`
}
