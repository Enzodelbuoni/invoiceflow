import { DISCOUNT_TYPE } from "@/lib/constants/discount-types"
import { parseCurrencyInput } from "@/lib/money"
import { MAX_PERCENT_BASIS_POINTS, parsePercentInput } from "@/lib/percent"
import { parseQuantityInput } from "@/lib/quantity"

// Motor de cálculos do orçamento (Sprint 8): funções puras, só com inteiros.
//   subtotal do item = quantidade (centésimos) × preço (centavos) ÷ 100
//   subtotal         = soma dos itens
//   desconto         = subtotal × percentual (pontos-base) ÷ 10.000, ou o valor fixo
//   imposto          = (subtotal − desconto) × alíquota (pontos-base) ÷ 10.000
//   total            = subtotal − desconto + imposto
// Divisões arredondam meio para cima (arredondamento comercial: 0,5 centavo → 1).
// As multiplicações usam BigInt: o maior item possível (999.999,99 × R$ 99.999.999,99)
// passa de Number.MAX_SAFE_INTEGER. O resultado volta a Number só abaixo do teto.

/** Teto de cada item, do subtotal e do total: R$ 999.999.999,99. */
export const MAX_TOTAL_CENTS = 99_999_999_999

const MAX_TOTAL = BigInt(MAX_TOTAL_CENTS)

/** a ÷ b arredondado meio para cima (a ≥ 0, b > 0, BigInt). */
function divideRoundingHalfUp(numerator, denominator) {
  return (numerator * 2n + denominator) / (denominator * 2n)
}

/** BigInt → centavos (Number), ou null acima do teto. */
function toCents(value) {
  return value > MAX_TOTAL ? null : Number(value)
}

/**
 * Subtotal da linha em centavos: 150 (1,5) × 15033 (R$ 150,33) → 22550
 * (R$ 225,495 arredonda para R$ 225,50). `null` se passar do teto.
 */
export function calculateItemSubtotal(quantityHundredths, unitPriceCents) {
  return toCents(divideRoundingHalfUp(BigInt(quantityHundredths) * BigInt(unitPriceCents), 100n))
}

/** valor × pontos-base ÷ 10.000, arredondado meio para cima. */
function applyRate(cents, basisPoints) {
  return Number(divideRoundingHalfUp(BigInt(cents) * BigInt(basisPoints), 10_000n))
}

const EMPTY_TOTALS = Object.freeze({
  subtotal: 0,
  discountTotal: 0,
  taxTotal: 0,
  total: 0,
  discountExceedsSubtotal: false,
})

/**
 * Totais do orçamento (calculateQuoteTotals do plano), no formato de saída do
 * schema do orçamento:
 * @param {{
 *   items: Array<{ quantity_hundredths: number, unit_price_cents: number }>,
 *   discount_type: "percent" | "amount" | null,
 *   discount_value: number | null,   pontos-base (percent) ou centavos (amount)
 *   tax_rate_bps: number | null,
 * }} quote
 * @returns {{
 *   itemSubtotals: Array<number | null>,
 *   subtotal: number | null, discountTotal: number | null, taxTotal: number | null, total: number | null,
 *   discountExceedsSubtotal: boolean,
 * }}
 *   `null` = passou do teto (MAX_TOTAL_CENTS); um item acima do teto anula os totais.
 *   O desconto nunca passa do subtotal (o total nunca fica negativo); quando o
 *   valor fixo digitado passa, `discountExceedsSubtotal` avisa.
 */
export function calculateQuoteTotals({ items, discount_type, discount_value, tax_rate_bps }) {
  const itemSubtotals = items.map((item) => calculateItemSubtotal(item.quantity_hundredths, item.unit_price_cents))
  if (itemSubtotals.some((value) => value === null)) {
    return { itemSubtotals, subtotal: null, discountTotal: null, taxTotal: null, total: null, discountExceedsSubtotal: false }
  }

  const subtotal = toCents(itemSubtotals.reduce((sum, value) => sum + BigInt(value), 0n))
  if (subtotal === null) {
    return { itemSubtotals, subtotal: null, discountTotal: null, taxTotal: null, total: null, discountExceedsSubtotal: false }
  }

  let discountTotal = 0
  let discountExceedsSubtotal = false
  if (discount_type === DISCOUNT_TYPE.PERCENT && discount_value) {
    discountTotal = applyRate(subtotal, discount_value)
  } else if (discount_type === DISCOUNT_TYPE.AMOUNT && discount_value) {
    discountExceedsSubtotal = discount_value > subtotal
    discountTotal = Math.min(discount_value, subtotal)
  }

  const taxTotal = tax_rate_bps ? applyRate(subtotal - discountTotal, tax_rate_bps) : 0
  const total = toCents(BigInt(subtotal - discountTotal) + BigInt(taxTotal))

  return { itemSubtotals, subtotal, discountTotal, taxTotal, total, discountExceedsSubtotal }
}

/** Totais zerados (orçamento sem itens). */
export function emptyQuoteTotals() {
  return { itemSubtotals: [], ...EMPTY_TOTALS }
}

/**
 * Valores do FORMULÁRIO (textos) → entrada de calculateQuoteTotals, para o
 * resumo ao vivo. Tolerante: quantidade ou preço que ainda não são números
 * válidos contam como zero (o schema mostra o erro no campo); desconto e
 * imposto inválidos ou acima de 100% são ignorados.
 */
export function totalsInputFromForm(values) {
  const items = (values.items ?? []).map((item) => ({
    quantity_hundredths: parseQuantityInput(item.quantity ?? "") ?? 0,
    unit_price_cents: parseCurrencyInput(item.unit_price ?? "") ?? 0,
  }))

  let discount_value = null
  if (values.discount_type === DISCOUNT_TYPE.PERCENT) {
    const basisPoints = parsePercentInput(values.discount_value ?? "")
    discount_value = basisPoints !== null && basisPoints <= MAX_PERCENT_BASIS_POINTS ? basisPoints : null
  } else if (values.discount_type === DISCOUNT_TYPE.AMOUNT) {
    discount_value = parseCurrencyInput(values.discount_value ?? "")
  }

  let tax_rate_bps = null
  if (values.tax_enabled) {
    const basisPoints = parsePercentInput(values.tax_rate ?? "")
    tax_rate_bps = basisPoints !== null && basisPoints <= MAX_PERCENT_BASIS_POINTS ? basisPoints : null
  }

  return {
    items,
    discount_type: discount_value === null ? null : values.discount_type,
    discount_value,
    tax_rate_bps,
  }
}
