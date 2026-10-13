import { describe, expect, it } from "vitest"

import { previewQuoteFromForm } from "./quote-preview"
import { createEmptyQuoteForm } from "./validations/quote"

const TODAY = "2026-10-13"

const form = (overrides = {}) => ({
  ...createEmptyQuoteForm({ today: TODAY }),
  title: "  Site institucional ",
  items: [
    { service_id: "", name: "Landing page", description: "", quantity: "2", unit: "project", unit_price: "500,00" },
    { service_id: "", name: "Suporte", description: " Ajustes ", quantity: "1,5", unit: "hour", unit_price: "150,33" },
  ],
  discount_type: "percent",
  discount_value: "10",
  tax_enabled: true,
  tax_rate: "5",
  ...overrides,
})

describe("previewQuoteFromForm", () => {
  it("converte o formulário no formato do documento, com os totais do motor", () => {
    const quote = previewQuoteFromForm(form())
    expect(quote).toMatchObject({
      quote_number: null,
      status: "draft",
      title: "Site institucional",
      description: null,
      created_at: null,
      valid_until: "2026-10-28",
      discount_type: "percent",
      discount_value: 1000,
      tax_rate_bps: 500,
      subtotal_cents: 122550,
      discount_total_cents: 12255,
      tax_total_cents: 5515,
      total_cents: 115810,
      notes: null,
      terms: null,
    })
    expect(quote.items).toEqual([
      { name: "Landing page", description: null, quantity_hundredths: 200, unit: "project", unit_price_cents: 50000, subtotal_cents: 100000 },
      { name: "Suporte", description: "Ajustes", quantity_hundredths: 150, unit: "hour", unit_price_cents: 15033, subtotal_cents: 22550 },
    ])
  })

  it("na edição, mostra o número e a data do orçamento salvo", () => {
    const quote = previewQuoteFromForm(form(), { quote_number: "2026-001", created_at: "2026-10-13T12:00:00Z" })
    expect(quote).toMatchObject({ quote_number: "2026-001", created_at: "2026-10-13T12:00:00Z" })
  })

  it("é tolerante com o que ainda não foi preenchido", () => {
    const quote = previewQuoteFromForm(
      form({
        title: "",
        items: [{ service_id: "", name: "", description: "", quantity: "", unit: "unit", unit_price: "abc" }],
        discount_type: "none",
        tax_enabled: false,
      }),
    )
    expect(quote).toMatchObject({ title: "Orçamento sem título", total_cents: 0, discount_type: null, tax_rate_bps: null })
    expect(quote.items[0]).toMatchObject({ name: "Item 1", quantity_hundredths: 0, unit_price_cents: 0, subtotal_cents: 0 })
  })

  it("valores acima do teto → totais null (o documento mostra —)", () => {
    const huge = { service_id: "", name: "Item", description: "", quantity: "999.999,99", unit: "unit", unit_price: "99.999.999,99" }
    const quote = previewQuoteFromForm(form({ items: [huge] }))
    expect(quote).toMatchObject({ subtotal_cents: null, total_cents: null })
    expect(quote.items[0].subtotal_cents).toBeNull()
  })
})
