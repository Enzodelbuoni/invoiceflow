import { describe, expect, it } from "vitest"

import { parsePeriod } from "./dashboard"
import {
  MAX_MONTH_BUCKETS,
  bucketStart,
  buildSendSeries,
  formatDayRange,
  narrowLabelMask,
  nextBucketStart,
  niceTicks,
  seriesUnit,
} from "./dashboard-series"

// 15/10/2026 (quinta-feira), 14h em São Paulo.
const NOW = new Date("2026-10-15T17:00:00Z")

const row = (day, reached, approved = 0, reachedValue = reached * 100_000, approvedValue = approved * 100_000) => ({
  day,
  reached,
  approved,
  reached_value_cents: reachedValue,
  approved_value_cents: approvedValue,
})

describe("bucketStart / nextBucketStart", () => {
  it.each([
    ["2026-10-15", "week", "2026-10-12"], // quinta → segunda
    ["2026-10-12", "week", "2026-10-12"], // segunda é o próprio dia
    ["2026-10-18", "week", "2026-10-12"], // domingo fecha a semana
    ["2026-01-01", "week", "2025-12-29"], // semana que atravessa o ano
    ["2026-10-15", "month", "2026-10-01"],
    ["2026-10-15", "year", "2026-01-01"],
  ])("%s por %s → %s", (day, unit, expected) => {
    expect(bucketStart(day, unit)).toBe(expected)
  })

  it.each([
    ["2026-10-12", "week", "2026-10-19"],
    ["2025-12-29", "week", "2026-01-05"],
    ["2026-01-01", "month", "2026-02-01"],
    ["2026-12-01", "month", "2027-01-01"],
    ["2026-01-01", "year", "2027-01-01"],
  ])("depois de %s (%s) → %s", (start, unit, expected) => {
    expect(nextBucketStart(start, unit)).toBe(expected)
  })
})

describe("seriesUnit", () => {
  it("30 e 90 dias por semana; 12 meses por mês", () => {
    expect(seriesUnit(parsePeriod("30d"), "2026-09-15", "2026-10-15")).toBe("week")
    expect(seriesUnit(parsePeriod("90d"), "2026-07-17", "2026-10-15")).toBe("week")
    expect(seriesUnit(parsePeriod("12m"), "2025-10-15", "2026-10-15")).toBe("month")
  })

  it(`"Tudo" por mês até ${MAX_MONTH_BUCKETS} meses; depois, por ano`, () => {
    const all = parsePeriod("tudo")
    expect(seriesUnit(all, "2024-11-03", "2026-10-15")).toBe("month") // 24 meses
    expect(seriesUnit(all, "2024-10-31", "2026-10-15")).toBe("year") // 25 meses
    expect(seriesUnit(all, null, "2026-10-15")).toBe("month")
  })
})

describe("formatDayRange", () => {
  it.each([
    ["2026-09-14", "2026-09-20", "14 a 20 de set."],
    ["2026-09-28", "2026-10-04", "28 de set. a 4 de out."],
    ["2025-12-29", "2026-01-04", "29 de dez. de 2025 a 4 de jan. de 2026"],
    ["2026-10-15", "2026-10-15", "15 de out. de 2026"],
  ])("%s → %s", (start, end, expected) => {
    expect(formatDayRange(start, end)).toBe(expected)
  })
})

describe("buildSendSeries", () => {
  it("30 dias: semanas de segunda a domingo, a 1ª e a última incompletas, sem envio = zero", () => {
    const series = buildSendSeries([row("2026-09-16", 1), row("2026-10-13", 2, 1), row("2026-10-15", 1, 1)], {
      period: parsePeriod("30d"),
      now: NOW,
    })
    expect(series.unit).toBe("week")
    expect(series.buckets.map((b) => b.key)).toEqual(["2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"])
    expect(series.buckets.map((b) => [b.reached, b.approved])).toEqual([[1, 0], [0, 0], [0, 0], [0, 0], [3, 2]])

    const [first, , , , last] = series.buckets
    // O período começa em 15/09 (30 dias antes de 15/10), uma terça.
    expect(first).toMatchObject({ start: "2026-09-15", end: "2026-09-20", partial: true, label: "14/9" })
    expect(first.title).toBe("14 a 20 de set.")
    expect(first.note).toBe("15 a 20 de set.")
    expect(last).toMatchObject({ start: "2026-10-12", end: "2026-10-15", partial: true, note: "12 a 15 de out." })
    expect(series.buckets[1]).toMatchObject({ partial: false, note: null, conversion: null })
    expect(last.conversion).toBeCloseTo(2 / 3)
  })

  it("12 meses: 13 meses (de out. de 2025 a out. de 2026), ano embaixo do 1º e de janeiro", () => {
    const series = buildSendSeries([row("2025-10-20", 2, 1), row("2026-01-05", 1), row("2026-10-01", 3, 2)], {
      period: parsePeriod("12m"),
      now: NOW,
    })
    expect(series.unit).toBe("month")
    expect(series.buckets).toHaveLength(13)
    const labels = series.buckets.map((b) => [b.label, b.sublabel])
    expect(labels[0]).toEqual(["out.", "2025"])
    expect(labels[1]).toEqual(["nov.", null])
    expect(labels[3]).toEqual(["jan.", "2026"])
    expect(labels[12]).toEqual(["out.", null])
    expect(series.buckets[0]).toMatchObject({ title: "Outubro de 2025", partial: true, note: "15 a 31 de out." })
    expect(series.buckets[12]).toMatchObject({ title: "Outubro de 2026", note: "1 a 15 de out.", reached: 3, approved: 2 })
    expect(series.buckets[6]).toMatchObject({ title: "Abril de 2026", partial: false, note: null, reached: 0 })
  })

  it("totais = soma das linhas (e batem com o painel)", () => {
    const series = buildSendSeries([row("2026-10-01", 3, 2, 900_000, 500_000), row("2026-10-14", 1, 0, 100_000, 0)], {
      period: parsePeriod("90d"),
      now: NOW,
    })
    expect(series.totals).toEqual({ reached: 4, approved: 2, reachedValueCents: 1_000_000, approvedValueCents: 500_000 })
    expect(series.buckets.reduce((sum, b) => sum + b.reachedValueCents, 0)).toBe(1_000_000)
  })

  it("'Tudo' começa no 1º envio; sem nenhum envio, não há intervalos", () => {
    const series = buildSendSeries([row("2026-08-10", 1)], { period: parsePeriod("tudo"), now: NOW })
    expect(series.buckets.map((b) => b.key)).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"])
    expect(series.buckets[0]).toMatchObject({ start: "2026-08-10", note: "10 a 31 de ago." })

    expect(buildSendSeries([], { period: parsePeriod("tudo"), now: NOW }).buckets).toEqual([])
  })

  it("'Tudo' com mais de 24 meses agrupa por ano", () => {
    const series = buildSendSeries([row("2023-05-02", 2, 1), row("2025-03-01", 1), row("2026-02-10", 4, 3)], {
      period: parsePeriod("tudo"),
      now: NOW,
    })
    expect(series.unit).toBe("year")
    expect(series.buckets.map((b) => [b.label, b.reached, b.approved])).toEqual([
      ["2023", 2, 1],
      ["2024", 0, 0],
      ["2025", 1, 0],
      ["2026", 4, 3],
    ])
    expect(series.buckets[0].note).toBe("2 de mai. a 31 de dez.")
  })

  it("período sem envio: intervalos zerados (o quadro do gráfico continua)", () => {
    const series = buildSendSeries([], { period: parsePeriod("30d"), now: NOW })
    expect(series.buckets).toHaveLength(5)
    expect(series.buckets.every((b) => b.reached === 0 && b.conversion === null)).toBe(true)
    expect(series.totals.reached).toBe(0)
  })

  it("aceita as linhas fora de ordem", () => {
    const series = buildSendSeries([row("2026-10-14", 1), row("2026-09-16", 2)], { period: parsePeriod("30d"), now: NOW })
    expect(series.buckets[0].reached).toBe(2)
    expect(series.buckets.at(-1).reached).toBe(1)
  })
})

describe("narrowLabelMask", () => {
  const buckets = (n, withYear = []) =>
    Array.from({ length: n }, (_, i) => ({ sublabel: withYear.includes(i) ? "2026" : null }))

  it("até 8 intervalos, todos visíveis", () => {
    expect(narrowLabelMask(buckets(8))).toEqual(Array(8).fill(true))
  })

  it("acima de 8, alterna", () => {
    expect(narrowLabelMask(buckets(9))).toEqual([true, false, true, false, true, false, true, false, true])
  })

  it("o rótulo com o ano nunca some, e os vizinhos dele dão lugar", () => {
    // 12 meses: out. 2025 (0) … jan. 2026 (3) … out. 2026 (12)
    const mask = narrowLabelMask(buckets(13, [0, 3]))
    expect(mask[0]).toBe(true)
    expect(mask[3]).toBe(true)
    expect(mask[2]).toBe(false)
    expect(mask[4]).toBe(false)
    // nunca dois vizinhos visíveis
    expect(mask.some((shown, i) => shown && mask[i + 1])).toBe(false)
  })
})

describe("niceTicks", () => {
  it.each([
    [0, [0, 1]],
    [1, [0, 1]],
    [3, [0, 1, 2, 3]],
    [4, [0, 1, 2, 3, 4]],
    [5, [0, 2, 4, 6]],
    [7, [0, 2, 4, 6, 8]],
    [13, [0, 5, 10, 15]],
    [40, [0, 10, 20, 30, 40]],
    [41, [0, 20, 40, 60]],
    [1234, [0, 500, 1000, 1500]],
  ])("%d → %j", (max, expected) => {
    expect(niceTicks(max)).toEqual(expected)
  })
})
