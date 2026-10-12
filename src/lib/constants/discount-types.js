/**
 * Tipo de desconto do orçamento (regra 3 do plano: percentual OU valor fixo,
 * nunca os dois). "percent" e "amount" serão os valores de quotes.discount_type
 * (Sprint 10); "none" é só do formulário e vira null no banco.
 */
export const DISCOUNT_TYPE = Object.freeze({
  NONE: "none",
  PERCENT: "percent",
  AMOUNT: "amount",
})

export const DISCOUNT_TYPE_VALUES = Object.freeze(Object.values(DISCOUNT_TYPE))
