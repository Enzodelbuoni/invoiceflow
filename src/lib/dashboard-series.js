// Série do gráfico "enviadas e aprovadas" do painel (Sprint 18, parte 2).
// O banco devolve uma linha por dia com envio (quote_sends_by_day, no fuso de
// São Paulo); aqui os dias viram semanas, meses ou anos, os intervalos sem
// envio entram zerados e saem os rótulos. Funções puras, testadas.
//
// Datas como texto "AAAA-MM-DD" (calendário de São Paulo), com as contas em UTC
// (ver lib/dates.js).

import { addDaysIso, todayIso } from "@/lib/dates"
import { periodSince } from "@/lib/dashboard"

/** Acima disso, "Tudo" agrupa por ano em vez de mês. */
export const MAX_MONTH_BUCKETS = 24

export const SERIES_UNIT_LABELS = Object.freeze({
  week: "por semana",
  month: "por mês",
  year: "por ano",
})

function utc(iso) {
  return new Date(`${iso}T00:00:00Z`)
}

const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
const monthLong = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })
const dayMonthYear = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })

/** Início do intervalo que contém o dia: segunda-feira, dia 1 do mês ou 1º de janeiro. */
export function bucketStart(iso, unit) {
  if (unit === "month") return `${iso.slice(0, 7)}-01`
  if (unit === "year") return `${iso.slice(0, 4)}-01-01`
  const weekday = utc(iso).getUTCDay() // 0 = domingo
  return addDaysIso(iso, -((weekday + 6) % 7))
}

/** Início do intervalo seguinte. */
export function nextBucketStart(start, unit) {
  if (unit === "week") return addDaysIso(start, 7)
  const date = utc(start)
  if (unit === "month") date.setUTCMonth(date.getUTCMonth() + 1)
  else date.setUTCFullYear(date.getUTCFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

function monthsBetween(from, to) {
  return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7))
}

/**
 * Unidade do gráfico para o período: 30 e 90 dias → semanas; 12 meses → meses;
 * "Tudo" → meses, ou anos se passar de MAX_MONTH_BUCKETS meses.
 */
export function seriesUnit(period, firstDay, today) {
  if (period.days !== null) return period.days <= 90 ? "week" : "month"
  return firstDay && monthsBetween(firstDay, today) + 1 > MAX_MONTH_BUCKETS ? "year" : "month"
}

/** "out." (sem o ponto final duplicado do Intl em alguns ambientes) */
function shortMonth(iso) {
  return monthShort.format(utc(iso)).replace(/\.?$/, ".")
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "14 a 20 de set." / "28 de set. a 4 de out." / "28 de dez. de 2025 a 3 de jan. de 2026" */
export function formatDayRange(start, end) {
  if (start === end) return dayMonthYear.format(utc(start))
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  if (sameYear && start.slice(0, 7) === end.slice(0, 7)) {
    return `${Number(start.slice(8))} a ${dayMonth.format(utc(end))}`
  }
  const fmt = sameYear ? dayMonth : dayMonthYear
  return `${fmt.format(utc(start))} a ${fmt.format(utc(end))}`
}

/**
 * Rótulos de um intervalo:
 * - `label`: eixo (curto): "14/9", "out.", "2025";
 * - `sublabel`: ano embaixo do mês no 1º intervalo e em janeiro (senão null);
 * - `title`: "14 a 20 de set.", "Outubro de 2026", "2025";
 * - `note`: o pedaço coberto, quando o intervalo está incompleto ("1 a 15 de out.").
 */
function describeBucket({ key, start, end, partial }, unit, index) {
  if (unit === "week") {
    return {
      label: `${Number(key.slice(8))}/${Number(key.slice(5, 7))}`,
      sublabel: null,
      title: formatDayRange(key, addDaysIso(nextBucketStart(key, unit), -1)),
      note: partial ? formatDayRange(start, end) : null,
    }
  }
  if (unit === "month") {
    return {
      label: shortMonth(key),
      sublabel: index === 0 || key.slice(5, 7) === "01" ? key.slice(0, 4) : null,
      title: capitalize(monthLong.format(utc(key))),
      note: partial ? formatDayRange(start, end) : null,
    }
  }
  return { label: key.slice(0, 4), sublabel: null, title: key.slice(0, 4), note: partial ? formatDayRange(start, end) : null }
}

/**
 * Linhas do banco ({ day, reached, approved, reached_value_cents,
 * approved_value_cents }) → série do gráfico no período.
 * O intervalo vai do início do período (ou do 1º envio, em "Tudo") até hoje;
 * o 1º e o último intervalo podem estar incompletos (`partial`, com `note`).
 * Sem nenhum envio em "Tudo", não há intervalos.
 * @returns {{ unit: "week"|"month"|"year", buckets: Array<object>,
 *   totals: { reached: number, approved: number, reachedValueCents: number, approvedValueCents: number } }}
 */
export function buildSendSeries(rows, { period, now = new Date() }) {
  const days = [...rows].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
  const today = todayIso(now)
  const since = period.days === null ? null : todayIso(periodSince(period, now))
  const first = [since, days[0]?.day].filter(Boolean).sort()[0] ?? null
  const last = [today, days.at(-1)?.day].filter(Boolean).sort().at(-1)
  const unit = seriesUnit(period, first, today)
  const totals = { reached: 0, approved: 0, reachedValueCents: 0, approvedValueCents: 0 }
  if (!first) return { unit, buckets: [], totals }

  const buckets = []
  const byKey = new Map()
  for (let key = bucketStart(first, unit); key <= last; key = nextBucketStart(key, unit)) {
    const bucketEnd = addDaysIso(nextBucketStart(key, unit), -1)
    const start = key < first ? first : key
    const end = bucketEnd > last ? last : bucketEnd
    const bucket = {
      key,
      start,
      end,
      partial: start !== key || end !== bucketEnd,
      reached: 0,
      approved: 0,
      reachedValueCents: 0,
      approvedValueCents: 0,
    }
    buckets.push(bucket)
    byKey.set(key, bucket)
  }

  for (const row of days) {
    const bucket = byKey.get(bucketStart(row.day, unit))
    bucket.reached += row.reached
    bucket.approved += row.approved
    bucket.reachedValueCents += row.reached_value_cents
    bucket.approvedValueCents += row.approved_value_cents
    totals.reached += row.reached
    totals.approved += row.approved
    totals.reachedValueCents += row.reached_value_cents
    totals.approvedValueCents += row.approved_value_cents
  }

  return {
    unit,
    buckets: buckets.map((bucket, index) => ({
      ...bucket,
      ...describeBucket(bucket, unit, index),
      conversion: bucket.reached > 0 ? bucket.approved / bucket.reached : null,
    })),
    totals,
  }
}

/**
 * Quais rótulos do eixo ficam visíveis quando falta largura (celular): até 8
 * intervalos, todos; acima disso, um sim, um não, sem dois vizinhos visíveis,
 * e os que trazem o ano (sublabel) nunca somem.
 * @returns {boolean[]}
 */
export function narrowLabelMask(buckets) {
  if (buckets.length <= 8) return buckets.map(() => true)
  const visible = buckets.map((bucket) => Boolean(bucket.sublabel))
  visible.forEach((shown, i) => {
    if (!shown && !visible[i - 1] && !visible[i + 1]) visible[i] = true
  })
  return visible
}

/**
 * Marcas do eixo das quantidades: de 0 até um valor "redondo" ≥ max, com no
 * máximo `maxIntervals` intervalos de 1, 2 ou 5 × 10ⁿ (inteiros: é contagem).
 * 3 → [0, 1, 2, 3]; 7 → [0, 2, 4, 6, 8]; 13 → [0, 5, 10, 15]; 0 → [0, 1].
 */
export function niceTicks(max, maxIntervals = 4) {
  const target = Math.max(1, Math.ceil(max))
  let step = 1
  for (let magnitude = 1; ; magnitude *= 10) {
    const found = [1, 2, 5].map((m) => m * magnitude).find((s) => Math.ceil(target / s) <= maxIntervals)
    if (found) {
      step = found
      break
    }
  }
  const top = Math.ceil(target / step) * step
  return Array.from({ length: top / step + 1 }, (_, i) => i * step)
}
