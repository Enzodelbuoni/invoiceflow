import { calculateQuoteTotals } from "@/lib/calculations/quote"
import { DISCOUNT_TYPE } from "@/lib/constants/discount-types"
import { SERVICE_UNIT } from "@/lib/constants/service-units"
import { addDaysIso, todayIso } from "@/lib/dates"

// Proposta de exemplo da página inicial (etapa 42). É desenhada pelo mesmo
// QuotePreview que o cliente recebe, com os totais do mesmo motor de cálculos.
// Pessoas e empresas fictícias.

const ITEMS = Object.freeze([
  {
    name: "Identidade visual",
    description: "Logotipo, paleta de cores, tipografia e manual de uso.",
    quantity_hundredths: 100,
    unit: SERVICE_UNIT.PROJECT,
    unit_price_cents: 320000,
  },
  {
    name: "Site de uma página",
    description: "Layout responsivo, textos revisados e publicação.",
    quantity_hundredths: 100,
    unit: SERVICE_UNIT.PROJECT,
    unit_price_cents: 240000,
  },
  {
    name: "Gestão de redes sociais",
    description: "12 publicações por mês, com legendas e agendamento.",
    quantity_hundredths: 300,
    unit: SERVICE_UNIT.MONTH,
    unit_price_cents: 60000,
  },
])

const ADJUSTMENTS = Object.freeze({ discount_type: DISCOUNT_TYPE.PERCENT, discount_value: 1000, tax_rate_bps: 600 })

export const SAMPLE_ISSUER = Object.freeze({ name: "Estúdio Lia Moreira", address: "São Paulo, SP" })
export const SAMPLE_CLIENT = Object.freeze({ name: "Marina Lopes", company: "Café Bonsucesso" })

/** Quem aprova no exemplo (o aceite usa o nome digitado pelo cliente). */
export const SAMPLE_SIGNER = SAMPLE_CLIENT.name

/**
 * A proposta de exemplo no formato do QuotePreview, enviada hoje e válida por
 * 15 dias (a página é refeita uma vez por dia, então as datas acompanham).
 * @param {Date} [now]
 */
export function sampleQuote(now = new Date()) {
  const today = todayIso(now)
  const totals = calculateQuoteTotals({ items: ITEMS, ...ADJUSTMENTS })
  return {
    quote_number: `${today.slice(0, 4)}-014`,
    status: "sent",
    title: "Identidade visual e site para o Café Bonsucesso",
    description: "Marca, site e três meses de redes sociais para a abertura da nova loja.",
    created_at: now.toISOString(),
    sent_at: now.toISOString(),
    valid_until: addDaysIso(today, 15),
    ...ADJUSTMENTS,
    subtotal_cents: totals.subtotal,
    discount_total_cents: totals.discountTotal,
    tax_total_cents: totals.taxTotal,
    total_cents: totals.total,
    notes: "Inclui duas rodadas de ajustes em cada entrega.",
    terms: "50% na aprovação e 50% na entrega final.",
    items: ITEMS.map((item, index) => ({ ...item, subtotal_cents: totals.itemSubtotals[index] })),
  }
}
