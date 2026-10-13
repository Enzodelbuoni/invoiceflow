import { describe, expect, it } from "vitest"

import { copyValidityDays, toQuoteCopy } from "./quote-copy"

const CLIENT = "6f1c1d2e-0000-4000-8000-000000000001"
const SERVICE = "6f1c1d2e-0000-4000-8000-000000000002"

/** Orçamento como o getQuote devolve (com colunas que a cópia descarta). */
const source = (overrides = {}) => ({
  id: "6f1c1d2e-0000-4000-8000-0000000000aa",
  quote_number: "2026-001",
  status: "sent",
  client_id: CLIENT,
  title: "Site institucional",
  description: "Redesenho completo",
  // 13/10 às 10h em São Paulo (13h UTC); validade de 30 dias.
  created_at: "2026-10-13T13:00:00+00:00",
  updated_at: "2026-10-13T13:05:00+00:00",
  valid_until: "2026-11-12",
  discount_type: "percent",
  discount_value: 1000,
  tax_rate_bps: 500,
  subtotal_cents: 122550,
  discount_total_cents: 12255,
  tax_total_cents: 5515,
  total_cents: 115810,
  notes: "Pagamento em 2x",
  terms: null,
  items: [
    { position: 0, service_id: SERVICE, name: "Landing page", description: null, quantity_hundredths: 200, unit: "project", unit_price_cents: 50000, subtotal_cents: 100000 },
    { position: 1, service_id: null, name: "Suporte", description: "Ajustes", quantity_hundredths: 150, unit: "hour", unit_price_cents: 15033, subtotal_cents: 22550 },
  ],
  ...overrides,
})

describe("copyValidityDays", () => {
  it("o mesmo prazo do original (da criação até a validade)", () => {
    expect(copyValidityDays(source())).toBe(30)
  })

  it("a data de criação é a de São Paulo (01h UTC ainda é o dia anterior)", () => {
    expect(copyValidityDays(source({ created_at: "2026-10-14T01:00:00+00:00", valid_until: "2026-10-20" }))).toBe(7)
  })

  it.each([
    ["validade no mesmo dia da criação", "2026-10-13"],
    ["validade antes da criação", "2026-10-01"],
  ])("%s → prazo padrão (15)", (_, validUntil) => {
    expect(copyValidityDays(source({ valid_until: validUntil }))).toBe(15)
  })

  it("nunca passa de 1 ano", () => {
    expect(copyValidityDays(source({ valid_until: "2028-01-01" }))).toBe(365)
  })
})

describe("toQuoteCopy", () => {
  it("copia cliente, itens e condições; validade renovada a partir de hoje", () => {
    expect(toQuoteCopy(source(), { today: "2026-12-01" })).toEqual({
      client_id: CLIENT,
      title: "Site institucional",
      description: "Redesenho completo",
      valid_until: "2026-12-31",
      items: [
        { service_id: SERVICE, name: "Landing page", description: null, quantity_hundredths: 200, unit: "project", unit_price_cents: 50000 },
        { service_id: null, name: "Suporte", description: "Ajustes", quantity_hundredths: 150, unit: "hour", unit_price_cents: 15033 },
      ],
      discount_type: "percent",
      discount_value: 1000,
      tax_rate_bps: 500,
      notes: "Pagamento em 2x",
      terms: null,
    })
  })

  it("não leva número, status, totais nem ids do original", () => {
    const copy = toQuoteCopy(source(), { today: "2026-12-01" })
    for (const key of ["id", "quote_number", "status", "total_cents", "created_at", "updated_at"]) {
      expect(copy).not.toHaveProperty(key)
    }
    expect(copy.items[0]).not.toHaveProperty("position")
    expect(copy.items[0]).not.toHaveProperty("subtotal_cents")
  })
})
