import { describe, expect, it } from "vitest"

import { sampleQuote } from "@/components/landing/sample-quote"

describe("sampleQuote", () => {
  const now = new Date("2026-11-02T15:00:00Z")
  const quote = sampleQuote(now)

  it("usa os totais do motor de cálculos (10% de desconto e 6% de impostos)", () => {
    expect(quote.items.map((item) => item.subtotal_cents)).toEqual([320000, 240000, 180000])
    expect(quote.subtotal_cents).toBe(740000)
    expect(quote.discount_total_cents).toBe(74000)
    expect(quote.tax_total_cents).toBe(39960)
    expect(quote.total_cents).toBe(705960)
  })

  it("é enviada hoje e vale por 15 dias, com número no formato do banco", () => {
    expect(quote.sent_at).toBe(now.toISOString())
    expect(quote.valid_until).toBe("2026-11-17")
    expect(quote.quote_number).toMatch(/^[0-9]{4}-[0-9]{3,}$/)
    expect(quote.quote_number.startsWith("2026-")).toBe(true)
  })
})
