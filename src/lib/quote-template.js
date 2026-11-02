import { calculateQuoteTotals } from "@/lib/calculations/quote"
import { DISCOUNT_TYPE } from "@/lib/constants/discount-types"
import { addDaysIso } from "@/lib/dates"
import { formatCurrency } from "@/lib/money"
import { formatPercentValue } from "@/lib/percent"
import { copyValidityDays } from "@/lib/quote-copy"
import { toQuoteFormValues } from "@/lib/validations/quote"

// Modelos de orçamento (etapa 40): o que se repete entre propostas (itens,
// desconto, impostos, textos e a validade padrão em dias), sem cliente.
// Funções puras: orçamento → modelo ("Salvar como modelo"), modelo → valores
// do construtor ("Usar modelo") e o resumo que a lista mostra.

/** Itens no formato do banco (o mesmo de orçamentos e modelos). */
function copyItems(items) {
  return items.map((item) => ({
    service_id: item.service_id ?? null,
    name: item.name,
    description: item.description ?? null,
    quantity_hundredths: item.quantity_hundredths,
    unit: item.unit,
    unit_price_cents: item.unit_price_cents,
  }))
}

/**
 * Orçamento do banco (getQuote, com `items` em ordem) → dados de um modelo no
 * formato da função create_quote_template. O título vira o título sugerido e
 * o prazo do orçamento (da criação até a validade) vira a validade padrão.
 * Cliente, número e status não entram.
 * @param {object} quote
 * @param {{ name: string }} options nome do modelo (já validado)
 */
export function toTemplateFromQuote(quote, { name }) {
  return {
    name,
    title: quote.title,
    description: quote.description ?? null,
    validity_days: copyValidityDays(quote),
    items: copyItems(quote.items),
    discount_type: quote.discount_type ?? null,
    discount_value: quote.discount_value ?? null,
    tax_rate_bps: quote.tax_rate_bps ?? null,
    notes: quote.notes ?? null,
    terms: quote.terms ?? null,
  }
}

/**
 * Modelo do banco (com `items` em ordem) → valores iniciais do construtor de
 * orçamentos: os mesmos campos de um orçamento salvo, com a validade contada a
 * partir de hoje e o cliente (se já escolhido) mantido.
 * @param {object} template
 * @param {{ today: string, clientId?: string }} options `today` do servidor ("AAAA-MM-DD", SP)
 */
export function templateToQuoteFormValues(template, { today, clientId = "" }) {
  return toQuoteFormValues({
    ...template,
    client_id: clientId,
    title: template.title ?? "",
    valid_until: addDaysIso(today, template.validity_days),
  })
}

/**
 * Totais do modelo pelo motor de cálculos (a mesma conta do orçamento):
 * o "total estimado" que a lista e o seletor mostram. `total` é null acima
 * do teto.
 */
export function templateTotals(template) {
  return calculateQuoteTotals({
    items: template.items,
    discount_type: template.discount_type ?? null,
    discount_value: template.discount_value ?? null,
    tax_rate_bps: template.tax_rate_bps ?? null,
  })
}

/** "1 item", "3 itens", "Sem itens". */
export function templateItemsLabel(count) {
  if (count === 0) return "Sem itens"
  return count === 1 ? "1 item" : `${count} itens`
}

/**
 * O que o modelo traz, em frases curtas para os selos da lista:
 * ["Desconto de 10%", "Impostos de 5%", "Validade de 15 dias", "Termos"].
 */
export function templateHighlights(template) {
  const highlights = []
  if (template.discount_type === DISCOUNT_TYPE.PERCENT) {
    highlights.push(`Desconto de ${formatPercentValue(template.discount_value)}`)
  } else if (template.discount_type === DISCOUNT_TYPE.AMOUNT) {
    highlights.push(`Desconto de ${formatCurrency(template.discount_value)}`)
  }
  if (template.tax_rate_bps) highlights.push(`Impostos de ${formatPercentValue(template.tax_rate_bps)}`)
  highlights.push(template.validity_days === 1 ? "Validade de 1 dia" : `Validade de ${template.validity_days} dias`)
  if (template.terms) highlights.push("Termos")
  if (template.notes) highlights.push("Observações")
  return highlights
}
