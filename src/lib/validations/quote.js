import { z } from "zod"

import { SERVICE_UNIT, SERVICE_UNIT_VALUES } from "@/lib/constants/service-units"
import { addDaysIso, formatIsoDateShort, isIsoDate } from "@/lib/dates"
import { MAX_PRICE_CENTS, formatCurrency, formatCurrencyInput } from "@/lib/money"
import { DEFAULT_QUANTITY_INPUT, MAX_QUANTITY_HUNDREDTHS, formatQuantity } from "@/lib/quantity"
import { isUuid } from "@/lib/uuid"
import { basisPointsFromText, centsFromText, hundredthsFromText } from "@/lib/validations/numbers"
import { optionalText, requiredText } from "@/lib/validations/text"

// Orçamento: limites, valores iniciais do formulário e o schema Zod. A migração
// (tabelas quotes e quote_items, Sprint 10) deve repetir QUOTE_LIMITS, como
// clients/services repetem os CHECKs das suas migrações.

export const QUOTE_LIMITS = Object.freeze({
  titleMin: 2,
  titleMax: 120,
  description: 2000,
  notes: 2000,
  terms: 4000,
  /** Itens por orçamento. */
  items: 100,
  // O item copia nome e descrição do serviço, então os limites são os de services.
  itemNameMin: 2,
  itemNameMax: 120,
  itemDescription: 1000,
})

/** Atalhos de validade, em dias a partir de hoje. */
export const VALIDITY_PRESETS = Object.freeze([7, 15, 30])

export const DEFAULT_VALIDITY_DAYS = 15

/** Validade máxima (evita datas digitadas errado, como 2062 no lugar de 2026). */
export const VALIDITY_MAX_DAYS = 365

/** Unidade sugerida num item avulso. */
export const DEFAULT_ITEM_UNIT = SERVICE_UNIT.UNIT

/**
 * Tipo de desconto (regra 3 do plano: percentual OU valor fixo, nunca os dois).
 * "percent" e "amount" serão os valores de quotes.discount_type (Sprint 10);
 * "none" é só do formulário e vira null no banco.
 */
export const DISCOUNT_TYPE = Object.freeze({
  NONE: "none",
  PERCENT: "percent",
  AMOUNT: "amount",
})

/**
 * Valores iniciais de um orçamento novo. `today` ("AAAA-MM-DD", fuso de São
 * Paulo) vem do servidor, para servidor e navegador concordarem na data.
 */
export function createEmptyQuoteForm({ today }) {
  return {
    client_id: "",
    title: "",
    description: "",
    valid_until: addDaysIso(today, DEFAULT_VALIDITY_DAYS),
    items: [],
    // Desconto: tipo + valor ("10" se percentual, "150,00" se valor fixo).
    discount_type: DISCOUNT_TYPE.NONE,
    discount_value: "",
    // Imposto: ligado/desligado + alíquota ("5" = 5%).
    tax_enabled: false,
    tax_rate: "",
    notes: "",
    terms: "",
  }
}

/**
 * Item novo do formulário (valores de campo, todos texto).
 * - Do catálogo: SNAPSHOT do serviço (nome, descrição, unidade e preço são
 *   copiados; mudar o serviço depois não altera o orçamento). `service_id`
 *   fica só como referência, e o preço pode ser ajustado no orçamento.
 * - Sem `service`: item avulso, só deste orçamento.
 * @param {{ id: string, name: string, description: string|null, unit: string, price_cents: number }} [service]
 */
export function createQuoteItem(service) {
  if (!service) {
    return {
      service_id: "",
      name: "",
      description: "",
      quantity: DEFAULT_QUANTITY_INPUT,
      unit: DEFAULT_ITEM_UNIT,
      unit_price: "",
    }
  }
  return {
    service_id: service.id,
    name: service.name,
    description: service.description ?? "",
    quantity: DEFAULT_QUANTITY_INPUT,
    unit: service.unit,
    unit_price: formatCurrencyInput(service.price_cents),
  }
}

// ---------------------------------------------------------------------------
// Schema (Sprint 7)
// ---------------------------------------------------------------------------

const quoteItemSchema = z
  .object({
    service_id: z
      .string()
      .trim()
      .refine((value) => value === "" || isUuid(value), { error: "Serviço inválido." })
      .transform((value) => value || null),
    name: requiredText({
      min: QUOTE_LIMITS.itemNameMin,
      max: QUOTE_LIMITS.itemNameMax,
      minError: "Informe o nome do item.",
      maxError: `O nome pode ter no máximo ${QUOTE_LIMITS.itemNameMax} caracteres.`,
    }),
    description: optionalText(QUOTE_LIMITS.itemDescription, "A descrição"),
    quantity: hundredthsFromText({
      requiredError: "Informe a quantidade.",
      minError: "A quantidade precisa ser maior que zero.",
      maxError: `A quantidade pode ser no máximo ${formatQuantity(MAX_QUANTITY_HUNDREDTHS)}.`,
    }),
    unit: z.enum(SERVICE_UNIT_VALUES, { error: "Escolha a unidade." }),
    unit_price: centsFromText({
      requiredError: "Informe o preço unitário.",
      maxError: `O preço pode ser no máximo ${formatCurrency(MAX_PRICE_CENTS)}.`,
    }),
  })
  .transform(({ quantity, unit_price, ...item }) => ({
    ...item,
    quantity_hundredths: quantity,
    unit_price_cents: unit_price,
  }))

const REMOVE_HINT = "Para não aplicar, remova-o."

/** Valor do desconto conforme o tipo (o texto só tem sentido junto com o tipo). */
const DISCOUNT_VALUE_SCHEMAS = Object.freeze({
  [DISCOUNT_TYPE.PERCENT]: basisPointsFromText({
    requiredError: "Informe o percentual de desconto.",
    minError: `O desconto precisa ser maior que zero. ${REMOVE_HINT}`,
    maxError: "O desconto pode ser no máximo 100%.",
  }),
  [DISCOUNT_TYPE.AMOUNT]: centsFromText({
    requiredError: "Informe o valor do desconto.",
    min: 1,
    minError: `O desconto precisa ser maior que zero. ${REMOVE_HINT}`,
    maxError: `O desconto pode ser no máximo ${formatCurrency(MAX_PRICE_CENTS)}.`,
  }),
})

const taxRateSchema = basisPointsFromText({
  requiredError: "Informe a alíquota.",
  minError: `A alíquota precisa ser maior que zero. ${REMOVE_HINT}`,
  maxError: "A alíquota pode ser no máximo 100%.",
})

/**
 * Schema do orçamento (Sprint 7): valida o formulário (React Hook Form) e será
 * revalidado na Server Action de salvar (Sprint 10). Recebe `today`
 * ("AAAA-MM-DD", do servidor) por causa da regra de validade.
 *
 * Saída no formato do banco (valores monetários e afins em INTEIROS):
 * {
 *   client_id, title, description|null, valid_until ("AAAA-MM-DD"),
 *   items: [{ service_id|null, name, description|null, quantity_hundredths, unit, unit_price_cents }],
 *   discount_type: "percent"|"amount"|null,
 *   discount_value: pontos-base (percent) | centavos (amount) | null,
 *   tax_rate_bps: pontos-base | null,
 *   notes|null, terms|null,
 * }
 *
 * Ainda não valida "desconto ≤ subtotal": isso depende do motor de cálculos (Sprint 8).
 */
export function createQuoteSchema({ today }) {
  const latest = addDaysIso(today, VALIDITY_MAX_DAYS)

  return z
    .object({
      client_id: z
        .string({ error: "Escolha quem vai receber a proposta." })
        .refine(isUuid, { error: "Escolha quem vai receber a proposta." }),
      title: requiredText({
        min: QUOTE_LIMITS.titleMin,
        max: QUOTE_LIMITS.titleMax,
        minError: "Dê um título ao orçamento.",
        maxError: `O título pode ter no máximo ${QUOTE_LIMITS.titleMax} caracteres.`,
      }),
      description: optionalText(QUOTE_LIMITS.description, "A descrição"),
      // Comparar textos "AAAA-MM-DD" equivale a comparar as datas.
      valid_until: z
        .string({ error: "Informe até quando a proposta vale." })
        .min(1, { error: "Informe até quando a proposta vale.", abort: true })
        .refine(isIsoDate, { error: "Informe uma data válida.", abort: true })
        .refine((date) => date >= today, { error: "A validade não pode ser antes de hoje.", abort: true })
        .refine((date) => date <= latest, {
          error: `A validade pode ser de até 1 ano (${formatIsoDateShort(latest)}).`,
        }),
      items: z
        .array(quoteItemSchema)
        .min(1, { error: "Adicione pelo menos um item ao orçamento." })
        .max(QUOTE_LIMITS.items, { error: `O orçamento pode ter no máximo ${QUOTE_LIMITS.items} itens.` }),
      discount_type: z.enum(Object.values(DISCOUNT_TYPE), { error: "Escolha o tipo de desconto." }),
      discount_value: z.string(),
      tax_enabled: z.boolean(),
      tax_rate: z.string(),
      notes: optionalText(QUOTE_LIMITS.notes, "As observações"),
      terms: optionalText(QUOTE_LIMITS.terms, "Os termos"),
    })
    // Desconto e imposto: o valor só é validado quando estão ligados, e o erro
    // aparece no campo de valor.
    .superRefine((quote, ctx) => {
      const discountSchema = DISCOUNT_VALUE_SCHEMAS[quote.discount_type]
      if (discountSchema) {
        const result = discountSchema.safeParse(quote.discount_value)
        if (!result.success) {
          ctx.addIssue({ code: "custom", path: ["discount_value"], message: result.error.issues[0].message })
        }
      }
      if (quote.tax_enabled) {
        const result = taxRateSchema.safeParse(quote.tax_rate)
        if (!result.success) {
          ctx.addIssue({ code: "custom", path: ["tax_rate"], message: result.error.issues[0].message })
        }
      }
    })
    .transform(({ discount_type, discount_value, tax_enabled, tax_rate, ...quote }) => {
      const discountSchema = DISCOUNT_VALUE_SCHEMAS[discount_type]
      return {
        ...quote,
        discount_type: discountSchema ? discount_type : null,
        discount_value: discountSchema ? discountSchema.parse(discount_value) : null,
        tax_rate_bps: tax_enabled ? taxRateSchema.parse(tax_rate) : null,
      }
    })
}
