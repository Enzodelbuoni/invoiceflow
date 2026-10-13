import { addDaysIso, daysBetweenIso, todayIso } from "@/lib/dates"
import { DEFAULT_VALIDITY_DAYS, VALIDITY_MAX_DAYS } from "@/lib/validations/quote"

// "Duplicar como novo rascunho" (Sprint 13): o jeito de corrigir uma proposta
// que já foi enviada (e por isso não muda mais) ou de reaproveitar uma antiga.
// A cópia é um orçamento NOVO (número novo, rascunho), com o mesmo cliente,
// itens (o snapshot de cada um), desconto, impostos e textos.

/**
 * Prazo de validade do original em dias (da criação até a validade), para a
 * cópia valer o mesmo tempo a partir de hoje. Sem prazo aproveitável (validade
 * no mesmo dia ou antes da criação) → o padrão do app; nunca acima do máximo.
 */
export function copyValidityDays(source) {
  const createdOn = todayIso(new Date(source.created_at))
  const days = daysBetweenIso(createdOn, source.valid_until)
  if (!Number.isInteger(days) || days < 1) return DEFAULT_VALIDITY_DAYS
  return Math.min(days, VALIDITY_MAX_DAYS)
}

/**
 * Orçamento do banco (getQuote) → dados de um orçamento novo no formato do
 * createQuoteSchema (o que `insertQuote` recebe). Os totais são recalculados
 * pelo motor na gravação, como em qualquer orçamento novo.
 * @param {object} source orçamento com `items` em ordem
 * @param {{ today: string }} options "hoje" do servidor ("AAAA-MM-DD", SP)
 */
export function toQuoteCopy(source, { today }) {
  return {
    client_id: source.client_id,
    title: source.title,
    description: source.description,
    valid_until: addDaysIso(today, copyValidityDays(source)),
    items: source.items.map((item) => ({
      service_id: item.service_id,
      name: item.name,
      description: item.description,
      quantity_hundredths: item.quantity_hundredths,
      unit: item.unit,
      unit_price_cents: item.unit_price_cents,
    })),
    discount_type: source.discount_type,
    discount_value: source.discount_value,
    tax_rate_bps: source.tax_rate_bps,
    notes: source.notes,
    terms: source.terms,
  }
}
