import { z } from "zod"

import { DISCOUNT_TYPE } from "@/lib/constants/discount-types"
import {
  ADJUSTMENT_FIELDS,
  DEFAULT_VALIDITY_DAYS,
  QUOTE_LIMITS,
  VALIDITY_MAX_DAYS,
  quoteItemSchema,
  toQuoteFormValues,
  withAdjustmentsAndTotals,
} from "@/lib/validations/quote"
import { charLength, optionalText, requiredText } from "@/lib/validations/text"

// Modelos de orçamento (etapas 40 e 41): limites, valores do formulário do
// editor e schemas. A migração quote_templates repete estes limites (um teste
// confere lendo o SQL); os limites do conteúdo (itens, textos, valores) são os
// do orçamento (QUOTE_LIMITS).

export const QUOTE_TEMPLATE_LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 80,
})

const templateName = requiredText({
  min: QUOTE_TEMPLATE_LIMITS.nameMin,
  max: QUOTE_TEMPLATE_LIMITS.nameMax,
  minError: "Dê um nome ao modelo.",
  maxError: `O nome pode ter no máximo ${QUOTE_TEMPLATE_LIMITS.nameMax} caracteres.`,
})

/** "Salvar como modelo": só o nome (o conteúdo vem do orçamento, lido no servidor). */
export const templateNameSchema = z.object({ name: templateName })

/** Título sugerido: opcional, mas com o mínimo do título do orçamento quando preenchido. */
const suggestedTitle = z
  .string()
  .trim()
  .refine((value) => value === "" || charLength(value) >= QUOTE_LIMITS.titleMin, {
    error: `O título precisa ter pelo menos ${QUOTE_LIMITS.titleMin} caracteres (ou deixe em branco).`,
  })
  .refine((value) => charLength(value) <= QUOTE_LIMITS.titleMax, {
    error: `O título pode ter no máximo ${QUOTE_LIMITS.titleMax} caracteres.`,
  })
  .transform((value) => value || null)

/** Validade em dias (texto do campo → inteiro de 1 a 365). */
const validityDays = z
  .string()
  .trim()
  .min(1, { error: "Informe por quantos dias a proposta vale.", abort: true })
  .refine((value) => /^\d+$/.test(value), { error: "Use só números (quantidade de dias).", abort: true })
  .transform(Number)
  .refine((days) => days >= 1 && days <= VALIDITY_MAX_DAYS, {
    error: `A validade precisa ser de 1 a ${VALIDITY_MAX_DAYS} dias.`,
  })

/**
 * Schema do editor de modelos (etapa 41). Saída no formato da função
 * create/update_quote_template:
 * {
 *   name, title|null, description|null, validity_days,
 *   items: [{ service_id|null, name, description|null, quantity_hundredths, unit, unit_price_cents }],
 *   discount_type|null, discount_value|null, tax_rate_bps|null, notes|null, terms|null,
 * }
 * Diferente do orçamento: sem cliente, título opcional, validade em dias e
 * itens opcionais (um modelo pode guardar só condições e textos). Desconto,
 * imposto e tetos seguem as mesmas regras (withAdjustmentsAndTotals).
 */
export const quoteTemplateSchema = withAdjustmentsAndTotals(
  z.object({
    name: templateName,
    title: suggestedTitle,
    description: optionalText(QUOTE_LIMITS.description, "A descrição"),
    validity_days: validityDays,
    items: z
      .array(quoteItemSchema)
      .max(QUOTE_LIMITS.items, { error: `O modelo pode ter no máximo ${QUOTE_LIMITS.items} itens.` }),
    ...ADJUSTMENT_FIELDS,
    notes: optionalText(QUOTE_LIMITS.notes, "As observações"),
    terms: optionalText(QUOTE_LIMITS.terms, "Os termos"),
  }),
)

/**
 * Texto do campo de validade → dias (1 a 365) ou `null` enquanto inválido.
 * Para o resumo e a pré-visualização ao vivo (o schema dá as mensagens).
 */
export function validityDaysFromInput(text) {
  const value = typeof text === "string" ? text.trim() : ""
  if (!/^\d+$/.test(value)) return null
  const days = Number(value)
  return days >= 1 && days <= VALIDITY_MAX_DAYS ? days : null
}

/** Valores iniciais do editor para um modelo novo. */
export function createEmptyTemplateForm() {
  return {
    name: "",
    title: "",
    description: "",
    validity_days: String(DEFAULT_VALIDITY_DAYS),
    items: [],
    discount_type: DISCOUNT_TYPE.NONE,
    discount_value: "",
    tax_enabled: false,
    tax_rate: "",
    notes: "",
    terms: "",
  }
}

/**
 * Modelo do banco (com `items` em ordem) → valores do editor: o inverso do
 * quoteTemplateSchema (os campos em comum convertem como no orçamento).
 */
export function toTemplateFormValues(template) {
  // O modelo não tem cliente nem data de validade: só os campos em comum.
  const values = toQuoteFormValues({ ...template, client_id: "", title: template.title ?? "", valid_until: "" })
  return {
    name: template.name,
    title: values.title,
    description: values.description,
    validity_days: String(template.validity_days),
    items: values.items,
    discount_type: values.discount_type,
    discount_value: values.discount_value,
    tax_enabled: values.tax_enabled,
    tax_rate: values.tax_rate,
    notes: values.notes,
    terms: values.terms,
  }
}
