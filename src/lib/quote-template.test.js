import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { MAX_PRICE_CENTS } from "@/lib/money"
import { MAX_PERCENT_BASIS_POINTS } from "@/lib/percent"
import { MAX_QUANTITY_HUNDREDTHS } from "@/lib/quantity"
import { QUOTE_LIMITS, VALIDITY_MAX_DAYS, createQuoteSchema } from "@/lib/validations/quote"
import { QUOTE_TEMPLATE_LIMITS, templateNameSchema } from "@/lib/validations/quote-template"

import {
  templateHighlights,
  templateItemsLabel,
  templateToQuoteFormValues,
  templateTotals,
  toTemplateFromQuote,
} from "./quote-template"

const CLIENT = "6f1c1d2e-0000-4000-8000-000000000001"
const SERVICE = "6f1c1d2e-0000-4000-8000-000000000002"

/** Orçamento como o getQuote devolve (com colunas que o modelo descarta). */
const quote = (overrides = {}) => ({
  id: "6f1c1d2e-0000-4000-8000-0000000000aa",
  quote_number: "2026-001",
  status: "sent",
  client_id: CLIENT,
  title: "Site institucional",
  description: "Redesenho completo",
  // 13/10 às 10h em São Paulo; validade de 30 dias.
  created_at: "2026-10-13T13:00:00+00:00",
  updated_at: "2026-10-13T13:05:00+00:00",
  valid_until: "2026-11-12",
  discount_type: "percent",
  discount_value: 1000,
  tax_rate_bps: 500,
  subtotal_cents: 122550,
  total_cents: 115810,
  notes: "Pagamento em 2x",
  terms: null,
  items: [
    { position: 0, service_id: SERVICE, name: "Landing page", description: null, quantity_hundredths: 200, unit: "project", unit_price_cents: 50000, subtotal_cents: 100000 },
    { position: 1, service_id: null, name: "Suporte", description: "Ajustes", quantity_hundredths: 150, unit: "hour", unit_price_cents: 15033, subtotal_cents: 22550 },
  ],
  ...overrides,
})

/** Modelo como o banco devolve. */
const template = (overrides = {}) => ({
  id: "6f1c1d2e-0000-4000-8000-0000000000bb",
  name: "Site institucional",
  title: "Criação de site",
  description: null,
  validity_days: 15,
  discount_type: "percent",
  discount_value: 1000,
  tax_rate_bps: 500,
  notes: null,
  terms: "50% na aprovação",
  items: [
    { position: 0, service_id: SERVICE, name: "Landing page", description: null, quantity_hundredths: 200, unit: "project", unit_price_cents: 50000 },
    { position: 1, service_id: null, name: "Suporte", description: "Ajustes", quantity_hundredths: 150, unit: "hour", unit_price_cents: 15033 },
  ],
  ...overrides,
})

describe("toTemplateFromQuote", () => {
  it("leva o conteúdo e o prazo do orçamento; deixa de fora cliente, número, status e totais", () => {
    const result = toTemplateFromQuote(quote(), { name: "Pacote site" })
    expect(result).toEqual({
      name: "Pacote site",
      title: "Site institucional",
      description: "Redesenho completo",
      validity_days: 30,
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

  it("sem prazo aproveitável → validade padrão", () => {
    expect(toTemplateFromQuote(quote({ valid_until: "2026-10-13" }), { name: "X" }).validity_days).toBe(15)
  })
})

describe("templateToQuoteFormValues", () => {
  it("vira os valores do construtor, com a validade a partir de hoje", () => {
    const values = templateToQuoteFormValues(template(), { today: "2026-11-02" })
    expect(values).toMatchObject({
      client_id: "",
      title: "Criação de site",
      description: "",
      valid_until: "2026-11-17",
      discount_type: "percent",
      discount_value: "10",
      tax_enabled: true,
      tax_rate: "5",
      notes: "",
      terms: "50% na aprovação",
    })
    expect(values.items).toEqual([
      { service_id: SERVICE, name: "Landing page", description: "", quantity: "2", unit: "project", unit_price: "500,00" },
      { service_id: "", name: "Suporte", description: "Ajustes", quantity: "1,5", unit: "hour", unit_price: "150,33" },
    ])
  })

  it("mantém o cliente já escolhido; sem título sugerido, o título fica em branco", () => {
    const values = templateToQuoteFormValues(template({ title: null }), { today: "2026-11-02", clientId: CLIENT })
    expect(values.client_id).toBe(CLIENT)
    expect(values.title).toBe("")
  })

  it("com o cliente, passa no schema do orçamento e volta ao formato do banco", () => {
    const values = templateToQuoteFormValues(template(), { today: "2026-11-02", clientId: CLIENT })
    const parsed = createQuoteSchema({ today: "2026-11-02" }).parse(values)
    expect(parsed.items.map((item) => item.unit_price_cents)).toEqual([50000, 15033])
    expect(parsed).toMatchObject({ discount_value: 1000, tax_rate_bps: 500, valid_until: "2026-11-17" })
  })

  it("modelo sem itens, desconto ou imposto", () => {
    const values = templateToQuoteFormValues(
      template({ items: [], discount_type: null, discount_value: null, tax_rate_bps: null }),
      { today: "2026-11-02" },
    )
    expect(values).toMatchObject({ items: [], discount_type: "none", discount_value: "", tax_enabled: false, tax_rate: "" })
  })
})

describe("templateTotals", () => {
  it("a mesma conta do orçamento (desconto 10% e imposto 5%)", () => {
    expect(templateTotals(template())).toMatchObject({ subtotal: 122550, discountTotal: 12255, taxTotal: 5515, total: 115810 })
  })

  it("sem itens → zero (o desconto fixo não deixa o total negativo)", () => {
    const totals = templateTotals(template({ items: [], discount_type: "amount", discount_value: 5000 }))
    expect(totals).toMatchObject({ subtotal: 0, total: 0, discountExceedsSubtotal: true })
  })
})

describe("templateItemsLabel e templateHighlights", () => {
  it("contagem de itens", () => {
    expect(templateItemsLabel(0)).toBe("Sem itens")
    expect(templateItemsLabel(1)).toBe("1 item")
    expect(templateItemsLabel(12)).toBe("12 itens")
  })

  it("o que o modelo traz", () => {
    expect(templateHighlights(template())).toEqual(["Desconto de 10%", "Impostos de 5%", "Validade de 15 dias", "Termos"])
    expect(
      templateHighlights(template({ discount_type: "amount", discount_value: 15000, tax_rate_bps: null, validity_days: 1, terms: null, notes: "x" })),
    ).toEqual(["Desconto de R$ 150,00", "Validade de 1 dia", "Observações"])
  })
})

describe("templateNameSchema", () => {
  it("apara e confere o tamanho", () => {
    expect(templateNameSchema.parse({ name: "  Site  " })).toEqual({ name: "Site" })
    expect(templateNameSchema.safeParse({ name: "S" }).success).toBe(false)
    expect(templateNameSchema.safeParse({ name: "x".repeat(81) }).success).toBe(false)
  })
})

// A migração repete os limites do app: se um lado mudar sem o outro, o
// formulário aceitaria algo que o banco recusa.
describe("migração quote_templates × limites do app", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/20261102165540_quote_templates.sql", import.meta.url), "utf8")
  const tableBody = (name) => {
    const start = sql.indexOf(`create table public.${name} (`)
    return sql.slice(start, sql.indexOf("\n);", start))
  }
  const templates = tableBody("quote_templates")
  const items = tableBody("quote_template_items")

  it("modelo", () => {
    expect(templates).toContain(
      `char_length(btrim(name)) between ${QUOTE_TEMPLATE_LIMITS.nameMin} and ${QUOTE_TEMPLATE_LIMITS.nameMax}`,
    )
    expect(templates).toContain(`char_length(btrim(title)) between ${QUOTE_LIMITS.titleMin} and ${QUOTE_LIMITS.titleMax}`)
    expect(templates).toContain(`char_length(description) <= ${QUOTE_LIMITS.description}`)
    expect(templates).toContain(`char_length(notes) <= ${QUOTE_LIMITS.notes}`)
    expect(templates).toContain(`char_length(terms) <= ${QUOTE_LIMITS.terms}`)
    expect(templates).toContain(`validity_days between 1 and ${VALIDITY_MAX_DAYS}`)
    expect(templates).toContain(`discount_value between 1 and ${MAX_PERCENT_BASIS_POINTS}`)
    expect(templates).toContain(`discount_value between 1 and ${MAX_PRICE_CENTS}`)
    expect(templates).toContain(`tax_rate_bps between 1 and ${MAX_PERCENT_BASIS_POINTS}`)
  })

  it("itens e funções", () => {
    expect(items).toContain(`char_length(btrim(name)) between ${QUOTE_LIMITS.itemNameMin} and ${QUOTE_LIMITS.itemNameMax}`)
    expect(items).toContain(`char_length(description) <= ${QUOTE_LIMITS.itemDescription}`)
    expect(items).toContain(`quantity_hundredths between 1 and ${MAX_QUANTITY_HUNDREDTHS}`)
    expect(items).toContain(`unit_price_cents between 0 and ${MAX_PRICE_CENTS}`)
    expect(items).toContain(`position between 0 and ${QUOTE_LIMITS.items - 1}`)
    expect(sql).toContain(`jsonb_array_length(p_items) > ${QUOTE_LIMITS.items}`)
  })
})
