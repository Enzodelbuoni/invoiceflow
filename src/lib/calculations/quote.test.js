import { describe, expect, it } from "vitest"

import { MAX_PRICE_CENTS } from "@/lib/money"
import { MAX_QUANTITY_HUNDREDTHS } from "@/lib/quantity"

import {
  MAX_TOTAL_CENTS,
  calculateItemSubtotal,
  calculateQuoteTotals,
  emptyQuoteTotals,
  totalsInputFromForm,
} from "./quote"

const item = (quantity_hundredths, unit_price_cents) => ({ quantity_hundredths, unit_price_cents })
const quote = (items, overrides = {}) => ({ items, discount_type: null, discount_value: null, tax_rate_bps: null, ...overrides })

describe("calculateItemSubtotal", () => {
  it.each([
    [100, 15000, 15000, "1 × R$ 150,00 = R$ 150,00"],
    [200, 50000, 100000, "2 × R$ 500,00 = R$ 1.000,00"],
    [300, 3333, 9999, "3 × R$ 33,33 = R$ 99,99 (exato)"],
    [150, 15000, 22500, "1,5 hora × R$ 150,00 = R$ 225,00"],
    [25, 80000, 20000, "0,25 dia × R$ 800,00 = R$ 200,00"],
    [150, 15033, 22550, "1,5 × R$ 150,33 = R$ 225,495 → R$ 225,50 (meio para cima)"],
    [50, 1, 1, "0,5 × R$ 0,01 = meio centavo → 1 centavo"],
    [49, 1, 0, "0,49 × R$ 0,01 → 0"],
    [133, 333, 443, "1,33 × R$ 3,33 = 442,89 centavos → 443"],
    [100, 0, 0, "preço zero (cortesia)"],
  ])("%i × %i = %i (%s)", (quantity, price, expected) => {
    expect(calculateItemSubtotal(quantity, price)).toBe(expected)
  })

  it("acima do teto → null, mesmo onde a conta em Number perderia precisão", () => {
    // 999.999,99 × R$ 99.999.999,99 ≈ R$ 99,9 trilhões: passa de Number.MAX_SAFE_INTEGER.
    expect(calculateItemSubtotal(MAX_QUANTITY_HUNDREDTHS, MAX_PRICE_CENTS)).toBeNull()
    expect(calculateItemSubtotal(100, MAX_TOTAL_CENTS)).toBe(MAX_TOTAL_CENTS)
    expect(calculateItemSubtotal(100, MAX_TOTAL_CENTS + 1)).toBeNull()
  })

  it("o resultado é sempre um inteiro seguro", () => {
    for (const [quantity, price] of [[1, 1], [99, 9999], [12345, 67891], [99999999, 100]]) {
      expect(Number.isSafeInteger(calculateItemSubtotal(quantity, price))).toBe(true)
    }
  })
})

describe("calculateQuoteTotals", () => {
  it("sem itens → tudo zero", () => {
    expect(calculateQuoteTotals(quote([]))).toEqual({
      itemSubtotals: [],
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      total: 0,
      discountExceedsSubtotal: false,
    })
    expect(emptyQuoteTotals()).toEqual(calculateQuoteTotals(quote([])))
  })

  it("só itens: total = subtotal = soma das linhas", () => {
    expect(calculateQuoteTotals(quote([item(200, 50000), item(150, 15000)]))).toEqual({
      itemSubtotals: [100000, 22500],
      subtotal: 122500,
      discountTotal: 0,
      taxTotal: 0,
      total: 122500,
      discountExceedsSubtotal: false,
    })
  })

  it("desconto percentual + imposto sobre o subtotal COM desconto", () => {
    // R$ 1.000 − 10% (R$ 100) = R$ 900; imposto 5% de R$ 900 = R$ 45; total R$ 945.
    const totals = calculateQuoteTotals(
      quote([item(200, 50000)], { discount_type: "percent", discount_value: 1000, tax_rate_bps: 500 }),
    )
    expect(totals).toMatchObject({ subtotal: 100000, discountTotal: 10000, taxTotal: 4500, total: 94500 })
  })

  it("desconto em valor fixo", () => {
    const totals = calculateQuoteTotals(quote([item(100, 120000)], { discount_type: "amount", discount_value: 35000 }))
    expect(totals).toMatchObject({ subtotal: 120000, discountTotal: 35000, total: 85000, discountExceedsSubtotal: false })
  })

  it("percentuais arredondam meio para cima", () => {
    // 12,5% de R$ 333,33 = R$ 41,66625 → R$ 41,67
    expect(calculateQuoteTotals(quote([item(100, 33333)], { discount_type: "percent", discount_value: 1250 })).discountTotal).toBe(4167)
    // 5% de R$ 333,33 = R$ 16,6665 → R$ 16,67
    expect(calculateQuoteTotals(quote([item(100, 33333)], { tax_rate_bps: 500 })).taxTotal).toBe(1667)
    // 2,75% de R$ 100,00 = R$ 2,75 (exato)
    expect(calculateQuoteTotals(quote([item(100, 10000)], { tax_rate_bps: 275 })).taxTotal).toBe(275)
  })

  it("desconto de 100%: total zero (e imposto zero)", () => {
    const totals = calculateQuoteTotals(
      quote([item(100, 50000)], { discount_type: "percent", discount_value: 10000, tax_rate_bps: 500 }),
    )
    expect(totals).toMatchObject({ discountTotal: 50000, taxTotal: 0, total: 0 })
  })

  it("valor fixo maior que o subtotal: o desconto para no subtotal e o aviso liga", () => {
    const totals = calculateQuoteTotals(
      quote([item(100, 10000)], { discount_type: "amount", discount_value: 15000, tax_rate_bps: 500 }),
    )
    expect(totals).toMatchObject({ subtotal: 10000, discountTotal: 10000, taxTotal: 0, total: 0, discountExceedsSubtotal: true })
  })

  it("desconto sem valor ou tipo desconhecido não descontam", () => {
    expect(calculateQuoteTotals(quote([item(100, 10000)], { discount_type: "percent", discount_value: null })).discountTotal).toBe(0)
    expect(calculateQuoteTotals(quote([item(100, 10000)], { discount_type: null, discount_value: 500 })).discountTotal).toBe(0)
  })

  it("um item acima do teto anula os totais", () => {
    const totals = calculateQuoteTotals(quote([item(100, 1000), item(MAX_QUANTITY_HUNDREDTHS, MAX_PRICE_CENTS)]))
    expect(totals).toEqual({
      itemSubtotals: [1000, null],
      subtotal: null,
      discountTotal: null,
      taxTotal: null,
      total: null,
      discountExceedsSubtotal: false,
    })
  })

  it("soma dos itens acima do teto → subtotal null", () => {
    const totals = calculateQuoteTotals(quote([item(100, MAX_TOTAL_CENTS), item(100, 1)]))
    expect(totals.itemSubtotals).toEqual([MAX_TOTAL_CENTS, 1])
    expect(totals.subtotal).toBeNull()
  })

  it("imposto levando o total acima do teto → total null (subtotal continua valendo)", () => {
    // 1% de R$ 999.999.999,99 = R$ 9.999.999,9999 → R$ 10.000.000,00; o total passaria do teto.
    const totals = calculateQuoteTotals(quote([item(100, MAX_TOTAL_CENTS)], { tax_rate_bps: 100 }))
    expect(totals).toMatchObject({ subtotal: MAX_TOTAL_CENTS, taxTotal: 1_000_000_000, total: null })
  })

  it("invariantes com valores pseudoaleatórios: total = subtotal − desconto + imposto, nada negativo", () => {
    let seed = 20261012
    const next = (max) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return Math.floor((seed / 2147483648) * max)
    }
    for (let round = 0; round < 300; round++) {
      const items = Array.from({ length: 1 + next(8) }, () => item(1 + next(100000), next(5000000)))
      const percent = round % 2 === 0
      const totals = calculateQuoteTotals(
        quote(items, {
          discount_type: percent ? "percent" : "amount",
          discount_value: percent ? next(10001) : next(10000000),
          tax_rate_bps: next(3001),
        }),
      )
      expect(totals.subtotal).toBe(totals.itemSubtotals.reduce((sum, value) => sum + value, 0))
      expect(totals.discountTotal).toBeGreaterThanOrEqual(0)
      expect(totals.discountTotal).toBeLessThanOrEqual(totals.subtotal)
      expect(totals.taxTotal).toBeGreaterThanOrEqual(0)
      expect(totals.total).toBe(totals.subtotal - totals.discountTotal + totals.taxTotal)
      for (const value of [totals.subtotal, totals.discountTotal, totals.taxTotal, totals.total]) {
        expect(Number.isSafeInteger(value)).toBe(true)
      }
    }
  })
})

describe("totalsInputFromForm", () => {
  const form = (overrides = {}) => ({
    items: [],
    discount_type: "none",
    discount_value: "",
    tax_enabled: false,
    tax_rate: "",
    ...overrides,
  })

  it("converte os textos do formulário", () => {
    expect(
      totalsInputFromForm(
        form({
          items: [{ quantity: "1,5", unit_price: "1.500,00" }],
          discount_type: "percent",
          discount_value: "12,5",
          tax_enabled: true,
          tax_rate: "5",
        }),
      ),
    ).toEqual({
      items: [{ quantity_hundredths: 150, unit_price_cents: 150000 }],
      discount_type: "percent",
      discount_value: 1250,
      tax_rate_bps: 500,
    })
  })

  it("quantidade ou preço ainda inválidos contam como zero", () => {
    expect(totalsInputFromForm(form({ items: [{ quantity: "", unit_price: "abc" }] })).items).toEqual([
      { quantity_hundredths: 0, unit_price_cents: 0 },
    ])
  })

  it("desconto e imposto inválidos, acima de 100% ou desligados são ignorados", () => {
    expect(totalsInputFromForm(form({ discount_type: "percent", discount_value: "150" }))).toMatchObject({
      discount_type: null,
      discount_value: null,
    })
    expect(totalsInputFromForm(form({ discount_type: "amount", discount_value: "" }))).toMatchObject({ discount_type: null })
    expect(totalsInputFromForm(form({ discount_type: "none", discount_value: "10" }))).toMatchObject({ discount_type: null })
    expect(totalsInputFromForm(form({ tax_enabled: false, tax_rate: "5" })).tax_rate_bps).toBeNull()
    expect(totalsInputFromForm(form({ tax_enabled: true, tax_rate: "abc" })).tax_rate_bps).toBeNull()
  })

  it("valor fixo acima do subtotal passa adiante (o cálculo limita e avisa)", () => {
    const input = totalsInputFromForm(form({ items: [{ quantity: "1", unit_price: "100,00" }], discount_type: "amount", discount_value: "150,00" }))
    expect(calculateQuoteTotals(input)).toMatchObject({ discountTotal: 10000, discountExceedsSubtotal: true })
  })
})
