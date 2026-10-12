import { z } from "zod"

import { DEFAULT_SERVICE_UNIT, SERVICE_UNIT_VALUES } from "@/lib/constants/service-units"
import { MAX_PRICE_CENTS, formatCurrency, formatCurrencyInput } from "@/lib/money"
import { centsFromText } from "@/lib/validations/numbers"
import { optionalText, requiredText } from "@/lib/validations/text"

// Schema do serviço: valida o formulário (React Hook Form) e é revalidado na
// Server Action, que recebe os valores crus do formulário (todos texto).
// A saída já vem no formato do banco: { name, description, unit, price_cents }.
// Os limites repetem os CHECKs da migração create_services (um teste confere).

export const serviceSchema = z
  .object({
    name: requiredText({
      min: 2,
      max: 120,
      minError: "Informe o nome do serviço.",
      maxError: "O nome pode ter no máximo 120 caracteres.",
    }),
    description: optionalText(1000, "A descrição"),
    unit: z.enum(SERVICE_UNIT_VALUES, { error: "Escolha a unidade de cobrança." }),
    // Texto do campo com máscara ("1.500,00") → centavos inteiros.
    price: centsFromText({
      requiredError: "Informe o preço.",
      maxError: `O preço pode ser no máximo ${formatCurrency(MAX_PRICE_CENTS)}.`,
    }),
  })
  .transform(({ price, ...service }) => ({ ...service, price_cents: price }))

/** Valores iniciais do formulário (todos strings, como o RHF espera). */
export const EMPTY_SERVICE_FORM = Object.freeze({
  name: "",
  description: "",
  unit: DEFAULT_SERVICE_UNIT,
  price: "",
})

/** Serviço do banco → valores do formulário de edição. */
export function toServiceFormValues(service) {
  if (!service) return { ...EMPTY_SERVICE_FORM }
  return {
    name: service.name ?? "",
    description: service.description ?? "",
    unit: service.unit ?? DEFAULT_SERVICE_UNIT,
    price: formatCurrencyInput(service.price_cents),
  }
}
