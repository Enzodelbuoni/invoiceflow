import { describe, expect, it } from "vitest"

import { formatCurrency } from "@/lib/money"
import {
  createEmptyTemplateForm,
  quoteTemplateSchema,
  templateNameSchema,
  toTemplateFormValues,
  validityDaysFromInput,
} from "@/lib/validations/quote-template"

const SERVICE = "6f1c1d2e-0000-4000-8000-000000000002"

/** Modelo como o banco devolve (getQuoteTemplate). */
const template = (overrides = {}) => ({
  id: "6f1c1d2e-0000-4000-8000-0000000000bb",
  name: "Site institucional",
  title: "Criação de site",
  description: "Site com até 6 páginas",
  validity_days: 30,
  discount_type: "percent",
  discount_value: 1250,
  tax_rate_bps: 500,
  notes: null,
  terms: "50% na aprovação",
  created_at: "2026-11-02T13:00:00+00:00",
  updated_at: "2026-11-02T13:00:00+00:00",
  items: [
    { position: 0, service_id: SERVICE, name: "Landing page", description: null, quantity_hundredths: 200, unit: "project", unit_price_cents: 50000 },
    { position: 1, service_id: null, name: "Suporte", description: "Ajustes", quantity_hundredths: 150, unit: "hour", unit_price_cents: 15033 },
  ],
  ...overrides,
})

const form = (overrides = {}) => ({ ...createEmptyTemplateForm(), name: "Pacote mensal", ...overrides })

/** Mensagens de erro por caminho ("items.0.name"). */
function errorsOf(values) {
  const result = quoteTemplateSchema.safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]))
}

describe("createEmptyTemplateForm", () => {
  it("começa com 15 dias de validade, sem itens e sem ajustes", () => {
    expect(createEmptyTemplateForm()).toEqual({
      name: "",
      title: "",
      description: "",
      validity_days: "15",
      items: [],
      discount_type: "none",
      discount_value: "",
      tax_enabled: false,
      tax_rate: "",
      notes: "",
      terms: "",
    })
  })

  it("só com o nome já é um modelo válido (itens são opcionais)", () => {
    expect(quoteTemplateSchema.parse(form())).toEqual({
      name: "Pacote mensal",
      title: null,
      description: null,
      validity_days: 15,
      items: [],
      discount_type: null,
      discount_value: null,
      tax_rate_bps: null,
      notes: null,
      terms: null,
    })
  })
})

describe("toTemplateFormValues", () => {
  it("converte o modelo do banco para os textos do editor", () => {
    expect(toTemplateFormValues(template())).toEqual({
      name: "Site institucional",
      title: "Criação de site",
      description: "Site com até 6 páginas",
      validity_days: "30",
      items: [
        { service_id: SERVICE, name: "Landing page", description: "", quantity: "2", unit: "project", unit_price: "500,00" },
        { service_id: "", name: "Suporte", description: "Ajustes", quantity: "1,5", unit: "hour", unit_price: "150,33" },
      ],
      discount_type: "percent",
      discount_value: "12,5",
      tax_enabled: true,
      tax_rate: "5",
      notes: "",
      terms: "50% na aprovação",
    })
  })

  it("ida e volta: o schema devolve os mesmos dados do banco", () => {
    const saved = template({ discount_type: "amount", discount_value: 10000, tax_rate_bps: null, title: null })
    expect(quoteTemplateSchema.parse(toTemplateFormValues(saved))).toEqual({
      name: saved.name,
      title: null,
      description: saved.description,
      validity_days: 30,
      items: saved.items.map((item) => ({
        service_id: item.service_id,
        name: item.name,
        description: item.description,
        quantity_hundredths: item.quantity_hundredths,
        unit: item.unit,
        unit_price_cents: item.unit_price_cents,
      })),
      discount_type: "amount",
      discount_value: 10000,
      tax_rate_bps: null,
      notes: null,
      terms: saved.terms,
    })
  })
})

describe("quoteTemplateSchema", () => {
  it("exige o nome", () => {
    expect(errorsOf(form({ name: " " }))).toEqual({ name: "Dê um nome ao modelo." })
    expect(errorsOf(form({ name: "x".repeat(81) }))).toEqual({ name: "O nome pode ter no máximo 80 caracteres." })
  })

  it("título sugerido é opcional, mas com pelo menos 2 caracteres", () => {
    expect(quoteTemplateSchema.parse(form({ title: "  " })).title).toBeNull()
    expect(errorsOf(form({ title: "A" }))).toEqual({
      title: "O título precisa ter pelo menos 2 caracteres (ou deixe em branco).",
    })
    expect(errorsOf(form({ title: "x".repeat(121) }))).toEqual({ title: "O título pode ter no máximo 120 caracteres." })
  })

  it.each([
    ["", "Informe por quantos dias a proposta vale."],
    ["abc", "Use só números (quantidade de dias)."],
    ["1,5", "Use só números (quantidade de dias)."],
    ["0", "A validade precisa ser de 1 a 365 dias."],
    ["366", "A validade precisa ser de 1 a 365 dias."],
  ])("validade %j → erro", (value, message) => {
    expect(errorsOf(form({ validity_days: value }))).toEqual({ validity_days: message })
  })

  it("validade de 1 a 365 dias vira número", () => {
    expect(quoteTemplateSchema.parse(form({ validity_days: " 1 " })).validity_days).toBe(1)
    expect(quoteTemplateSchema.parse(form({ validity_days: "365" })).validity_days).toBe(365)
  })

  it("valida os itens como no orçamento", () => {
    const item = { service_id: "", name: "", description: "", quantity: "0", unit: "hour", unit_price: "" }
    expect(errorsOf(form({ items: [item] }))).toEqual({
      "items.0.name": "Informe o nome do item.",
      "items.0.quantity": "A quantidade precisa ser maior que zero.",
      "items.0.unit_price": "Informe o preço unitário.",
    })
  })

  it("aceita até 100 itens", () => {
    const item = { service_id: "", name: "Hora", description: "", quantity: "1", unit: "hour", unit_price: "10,00" }
    expect(quoteTemplateSchema.safeParse(form({ items: Array(100).fill(item) })).success).toBe(true)
    expect(errorsOf(form({ items: Array(101).fill(item) }))).toEqual({ items: "O modelo pode ter no máximo 100 itens." })
  })

  it("desconto e imposto ligados exigem valor (mesmas regras do orçamento)", () => {
    expect(errorsOf(form({ discount_type: "percent", tax_enabled: true }))).toEqual({
      discount_value: "Informe o percentual de desconto.",
      tax_rate: "Informe a alíquota.",
    })
  })

  it("desconto fixo não pode passar do subtotal dos itens", () => {
    const item = { service_id: "", name: "Hora", description: "", quantity: "1", unit: "hour", unit_price: "100,00" }
    expect(errorsOf(form({ items: [item], discount_type: "amount", discount_value: "150,00" }))).toEqual({
      discount_value: `O desconto não pode ser maior que o subtotal (${formatCurrency(10000)}).`,
    })
  })
})

describe("validityDaysFromInput", () => {
  it.each([
    ["15", 15],
    [" 7 ", 7],
    ["365", 365],
    ["0", null],
    ["366", null],
    ["", null],
    ["1,5", null],
    [undefined, null],
  ])("%j → %j", (text, days) => {
    expect(validityDaysFromInput(text)).toBe(days)
  })
})

describe("templateNameSchema", () => {
  it("continua aceitando só o nome (Salvar como modelo)", () => {
    expect(templateNameSchema.parse({ name: "  Site  " })).toEqual({ name: "Site" })
  })
})
