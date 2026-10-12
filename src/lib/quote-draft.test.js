import { describe, expect, it } from "vitest"

import { QUOTE_LIMITS, createEmptyQuoteForm, createQuoteItem } from "@/lib/validations/quote"

import { QUOTE_DRAFT_MAX_AGE_DAYS, hasDraftContent, isDraftExpired, sanitizeDraftValues } from "./quote-draft"

const TODAY = "2026-10-12"
const CLIENT = "6f1c1d2e-0000-4000-8000-000000000001"
const SERVICE = "6f1c1d2e-0000-4000-8000-000000000002"
const context = { today: TODAY, clientIds: new Set([CLIENT]), serviceIds: new Set([SERVICE]) }

describe("isDraftExpired", () => {
  const now = new Date("2026-10-12T18:00:00Z")

  it(`vale por até ${QUOTE_DRAFT_MAX_AGE_DAYS} dias`, () => {
    expect(isDraftExpired("2026-10-12T17:00:00Z", now)).toBe(false)
    expect(isDraftExpired("2026-09-12T18:00:00Z", now)).toBe(false) // exatamente 30 dias
    expect(isDraftExpired("2026-09-12T17:59:00Z", now)).toBe(true)
  })

  it("data inválida conta como vencida", () => {
    expect(isDraftExpired("ontem", now)).toBe(true)
    expect(isDraftExpired(undefined, now)).toBe(true)
  })
})

describe("hasDraftContent", () => {
  it("formulário intocado não tem conteúdo", () => {
    expect(hasDraftContent(createEmptyQuoteForm({ today: TODAY }), { today: TODAY })).toBe(false)
  })

  it.each([
    ["título", { title: "S" }],
    ["validade", { valid_until: "2026-11-11" }],
    ["item", { items: [createQuoteItem()] }],
    ["imposto ligado", { tax_enabled: true }],
  ])("qualquer mudança conta (%s)", (_, change) => {
    expect(hasDraftContent({ ...createEmptyQuoteForm({ today: TODAY }), ...change }, { today: TODAY })).toBe(true)
  })

  it("apagar o que foi digitado volta a não ter conteúdo", () => {
    const values = { ...createEmptyQuoteForm({ today: TODAY }), title: "" }
    expect(hasDraftContent(values, { today: TODAY })).toBe(false)
  })
})

describe("sanitizeDraftValues", () => {
  const full = {
    client_id: CLIENT,
    title: "Site institucional",
    description: "Novo site",
    valid_until: "2026-10-30",
    items: [
      { service_id: SERVICE, name: "Design", description: "2 rodadas", quantity: "1,5", unit: "hour", unit_price: "1.500,00" },
    ],
    discount_type: "percent",
    discount_value: "10",
    tax_enabled: true,
    tax_rate: "5",
    notes: "Obs",
    terms: "Termos",
  }

  it("valores válidos passam iguais", () => {
    expect(sanitizeDraftValues(full, context)).toEqual(full)
  })

  it("cliente excluído é desmarcado", () => {
    expect(sanitizeDraftValues({ ...full, client_id: "outro" }, context).client_id).toBe("")
  })

  it("item de serviço excluído vira avulso, mantendo o snapshot", () => {
    const [item] = sanitizeDraftValues({ ...full, items: [{ ...full.items[0], service_id: "excluido" }] }, context).items
    expect(item).toEqual({ ...full.items[0], service_id: "" })
  })

  it("rascunho de uma versão antiga: campos que faltam recebem o valor inicial", () => {
    expect(sanitizeDraftValues({ title: "Antigo" }, context)).toEqual({ ...createEmptyQuoteForm({ today: TODAY }), title: "Antigo" })
  })

  it("tipos errados são trocados pelos valores iniciais", () => {
    const values = sanitizeDraftValues(
      {
        ...full,
        title: 123,
        discount_type: "bonus",
        tax_enabled: "sim",
        valid_until: "",
        items: [{ name: null, quantity: 2, unit: "dozen" }, "lixo"],
      },
      context,
    )
    expect(values).toMatchObject({ title: "", discount_type: "none", tax_enabled: false, valid_until: "2026-10-27" })
    expect(values.items).toEqual([
      { ...createQuoteItem(), name: "", quantity: "1" },
      { ...createQuoteItem() },
    ])
  })

  it(`no máximo ${QUOTE_LIMITS.items} itens`, () => {
    const items = Array.from({ length: QUOTE_LIMITS.items + 5 }, () => createQuoteItem())
    expect(sanitizeDraftValues({ ...full, items }, context).items).toHaveLength(QUOTE_LIMITS.items)
  })

  it("valor que não é objeto vira o orçamento vazio", () => {
    expect(sanitizeDraftValues(null, context)).toEqual(createEmptyQuoteForm({ today: TODAY }))
    expect(sanitizeDraftValues("x", context)).toEqual(createEmptyQuoteForm({ today: TODAY }))
  })
})
