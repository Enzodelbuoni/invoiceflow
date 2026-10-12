import { z } from "zod"

import { MAX_PRICE_CENTS, parseCurrencyInput } from "@/lib/money"
import { MAX_PERCENT_BASIS_POINTS, parsePercentInput } from "@/lib/percent"
import { MAX_QUANTITY_HUNDREDTHS, parseQuantityInput } from "@/lib/quantity"

// Campos numéricos dos formulários: o texto digitado ("1.500,00", "1,5",
// "12,5") vira um INTEIRO (centavos, centésimos, pontos-base), com uma
// mensagem para cada problema. Só a primeira falha é informada.

/**
 * @param {{
 *   parse: (text: string) => number | null,
 *   requiredError: string,  campo vazio
 *   invalidError: string,   texto que não é um número
 *   min?: number, minError?: string,
 *   max: number, maxError: string,
 * }} options
 */
function integerFromText({ parse, requiredError, invalidError, min = 0, minError, max, maxError }) {
  return z
    .string({ error: requiredError })
    .trim()
    .min(1, { error: requiredError })
    .transform((text, ctx) => {
      const value = parse(text)
      if (value === null) {
        ctx.addIssue({ code: "custom", message: invalidError })
        return z.NEVER
      }
      if (value < min) {
        ctx.addIssue({ code: "custom", message: minError })
        return z.NEVER
      }
      if (value > max) {
        ctx.addIssue({ code: "custom", message: maxError })
        return z.NEVER
      }
      return value
    })
}

/** Valor em reais → centavos. Padrão: de R$ 0,00 até o teto de preço. */
export function centsFromText({ requiredError, maxError, min = 0, minError, max = MAX_PRICE_CENTS }) {
  return integerFromText({
    parse: parseCurrencyInput,
    requiredError,
    invalidError: "Digite um valor válido, como 1.500,00.",
    min,
    minError,
    max,
    maxError,
  })
}

/** Quantidade → centésimos; sempre maior que zero. */
export function hundredthsFromText({ requiredError, minError, maxError, max = MAX_QUANTITY_HUNDREDTHS }) {
  return integerFromText({
    parse: parseQuantityInput,
    requiredError,
    invalidError: "Digite uma quantidade válida, como 1 ou 1,5.",
    min: 1,
    minError,
    max,
    maxError,
  })
}

/** Percentual → pontos-base (12,5% = 1250); maior que zero e até 100%. */
export function basisPointsFromText({ requiredError, minError, maxError, max = MAX_PERCENT_BASIS_POINTS }) {
  return integerFromText({
    parse: parsePercentInput,
    requiredError,
    invalidError: "Digite um percentual válido, como 10 ou 12,5.",
    min: 1,
    minError,
    max,
    maxError,
  })
}
