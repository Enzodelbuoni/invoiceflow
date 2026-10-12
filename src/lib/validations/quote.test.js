import { describe, expect, it } from "vitest"

import { SERVICE_UNIT_VALUES } from "@/lib/constants/service-units"

import { DEFAULT_ITEM_UNIT, DISCOUNT_TYPE, QUOTE_LIMITS, createEmptyQuoteForm, createQuoteItem } from "./quote"
import { serviceSchema } from "./service"

describe("createEmptyQuoteForm", () => {
  it("começa sem itens, sem desconto, sem imposto e com validade de 15 dias", () => {
    const form = createEmptyQuoteForm({ today: "2026-10-12" })
    expect(form.items).toEqual([])
    expect(form.valid_until).toBe("2026-10-27")
    expect(form).toMatchObject({ discount_type: DISCOUNT_TYPE.NONE, discount_value: "", tax_rate: "" })
  })
})

describe("createQuoteItem", () => {
  it("item avulso: campos vazios, quantidade 1 e unidade padrão", () => {
    expect(createQuoteItem()).toEqual({
      service_id: "",
      name: "",
      description: "",
      quantity: "1",
      unit: DEFAULT_ITEM_UNIT,
      unit_price: "",
    })
    expect(SERVICE_UNIT_VALUES).toContain(DEFAULT_ITEM_UNIT)
  })

  it("do catálogo: copia nome, descrição, unidade e preço do serviço (snapshot)", () => {
    const service = {
      id: "6f1c1d2e-0000-4000-8000-000000000001",
      name: "Design de landing page",
      description: "Layout responsivo com 2 rodadas de ajustes.",
      unit: "project",
      price_cents: 480000,
    }
    expect(createQuoteItem(service)).toEqual({
      service_id: service.id,
      name: "Design de landing page",
      description: "Layout responsivo com 2 rodadas de ajustes.",
      quantity: "1",
      unit: "project",
      unit_price: "4.800,00",
    })
  })

  it("serviço sem descrição vira descrição vazia (campo de texto)", () => {
    const item = createQuoteItem({ id: "x", name: "Hora técnica", description: null, unit: "hour", price_cents: 15000 })
    expect(item.description).toBe("")
    expect(item.unit_price).toBe("150,00")
  })

  it("nenhum serviço válido do catálogo passa dos limites do item", () => {
    const service = (name, description) => serviceSchema.safeParse({ name, description, unit: "hour", price: "1,00" })
    // O maior serviço que o catálogo aceita cabe no item…
    expect(service("N".repeat(QUOTE_LIMITS.itemNameMax), "D".repeat(QUOTE_LIMITS.itemDescription)).success).toBe(true)
    // …e um caractere a mais o catálogo já recusa.
    expect(service("N".repeat(QUOTE_LIMITS.itemNameMax + 1), "").success).toBe(false)
    expect(service("Nome", "D".repeat(QUOTE_LIMITS.itemDescription + 1)).success).toBe(false)
  })
})
