import { calculateQuoteTotals, totalsInputFromForm } from "@/lib/calculations/quote"

// Pré-visualização do construtor (Sprint 11): valores do FORMULÁRIO (textos,
// talvez incompletos) → o formato que o QuotePreview desenha (o mesmo do
// banco). Tolerante como o resumo ao vivo: o que ainda não é número conta como
// zero e os totais vêm do mesmo motor de cálculos. Nada aqui é validado nem
// salvo; é só para a pessoa ver como o documento vai ficar.

const trimmed = (value) => (typeof value === "string" ? value.trim() : "")

/**
 * @param {object} values valores do formulário do construtor
 * @param {{ quote_number?: string|null, created_at?: string|null }} [saved]
 *   na edição, o número e a data do orçamento já salvo.
 * @returns o `quote` do QuotePreview; totais acima do teto viram `null` ("—").
 */
export function previewQuoteFromForm(values, saved = {}) {
  const input = totalsInputFromForm(values)
  const totals = calculateQuoteTotals(input)

  return {
    quote_number: saved.quote_number ?? null,
    status: "draft",
    title: trimmed(values.title) || "Orçamento sem título",
    description: trimmed(values.description) || null,
    created_at: saved.created_at ?? null,
    sent_at: null,
    valid_until: values.valid_until ?? "",
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    tax_rate_bps: input.tax_rate_bps,
    subtotal_cents: totals.subtotal,
    discount_total_cents: totals.discountTotal,
    tax_total_cents: totals.taxTotal,
    total_cents: totals.total,
    notes: trimmed(values.notes) || null,
    terms: trimmed(values.terms) || null,
    items: (values.items ?? []).map((item, index) => ({
      name: trimmed(item.name) || `Item ${index + 1}`,
      description: trimmed(item.description) || null,
      quantity_hundredths: input.items[index].quantity_hundredths,
      unit: item.unit,
      unit_price_cents: input.items[index].unit_price_cents,
      subtotal_cents: totals.itemSubtotals[index],
    })),
  }
}
