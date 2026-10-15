import { describe, expect, it } from "vitest"

import { DASHBOARD_PERIODS, countLabel, dashboardMetrics, describePeriod, parsePeriod, periodSince } from "./dashboard"

const raw = (overrides = {}) => ({
  total: 8,
  by_status: { draft: 1, sent: 1, viewed: 1, approved: 2, declined: 1, expired: 1, cancelled: 1 },
  reached: 6,
  reached_value_cents: 2_100_000,
  approved_value_cents: 1_000_001,
  open_value_cents: 500_000,
  ...overrides,
})

describe("parsePeriod", () => {
  it.each([
    ["30d", "30d"],
    ["90d", "90d"],
    ["12m", "12m"],
    ["tudo", "tudo"],
    [undefined, "12m"], // padrão
    ["7d", "12m"],
    [["30d", "90d"], "12m"], // ?periodo= repetido vira array
  ])("%j → %s", (value, expected) => {
    expect(parsePeriod(value).value).toBe(expected)
  })

  it("tem exatamente um período padrão", () => {
    expect(DASHBOARD_PERIODS.filter((period) => period.default)).toHaveLength(1)
  })
})

describe("periodSince", () => {
  const NOW = new Date("2026-10-14T15:00:00Z")

  it("30 dias antes de agora; 'Tudo' → null", () => {
    expect(periodSince(parsePeriod("30d"), NOW).toISOString()).toBe("2026-09-14T15:00:00.000Z")
    expect(periodSince(parsePeriod("12m"), NOW).toISOString()).toBe("2025-10-14T15:00:00.000Z")
    expect(periodSince(parsePeriod("tudo"), NOW)).toBeNull()
  })
})

describe("describePeriod", () => {
  it("texto de apoio", () => {
    expect(describePeriod(parsePeriod("90d"))).toBe("nos últimos 90 dias")
    expect(describePeriod(parsePeriod("tudo"))).toBe("desde o início")
  })
})

describe("dashboardMetrics", () => {
  it("conversão = aprovadas ÷ enviadas; em aberto = enviadas + visualizadas", () => {
    const metrics = dashboardMetrics(raw())
    expect(metrics.conversion).toBeCloseTo(2 / 6)
    expect(metrics.approved).toBe(2)
    expect(metrics.openCount).toBe(2)
    expect(metrics.openValueCents).toBe(500_000)
    expect(metrics.reachedValueCents).toBe(2_100_000)
  })

  it("ticket médio em centavos inteiros (arredondado)", () => {
    expect(dashboardMetrics(raw()).averageTicketCents).toBe(500_001) // 1.000.001 ÷ 2 = 500.000,5
  })

  it("sem enviadas → conversão null (não 0%); sem aprovadas → ticket null", () => {
    const metrics = dashboardMetrics(
      raw({
        total: 1,
        by_status: { draft: 1, sent: 0, viewed: 0, approved: 0, declined: 0, expired: 0, cancelled: 0 },
        reached: 0,
        reached_value_cents: 0,
        approved_value_cents: 0,
        open_value_cents: 0,
      }),
    )
    expect(metrics.conversion).toBeNull()
    expect(metrics.averageTicketCents).toBeNull()
  })

  it("enviadas sem nenhuma aprovada → 0% (essa conta existe)", () => {
    const metrics = dashboardMetrics(
      raw({ by_status: { draft: 0, sent: 3, viewed: 0, approved: 0, declined: 0, expired: 0, cancelled: 0 }, reached: 3 }),
    )
    expect(metrics.conversion).toBe(0)
  })
})

describe("countLabel", () => {
  it.each([
    [0, "0 propostas"],
    [1, "1 proposta"],
    [2, "2 propostas"],
    [1234, "1.234 propostas"],
  ])("%i → %s", (count, text) => {
    expect(countLabel(count, "proposta", "propostas")).toBe(text)
  })
})
