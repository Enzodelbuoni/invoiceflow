import { SERVICE_UNIT } from "@/lib/constants/service-units"
import { addDaysIso } from "@/lib/dates"
import { formatCurrencyInput } from "@/lib/money"
import { DEFAULT_QUANTITY_INPUT } from "@/lib/quantity"

// Orçamento: limites e valores iniciais do formulário. O schema Zod chega no
// Sprint 7 e a migração (tabelas quotes e quote_items) no Sprint 10; os dois
// devem repetir QUOTE_LIMITS, como clients/services repetem os CHECKs das suas migrações.

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
    // Imposto: percentual ("5" = 5%); vazio = sem imposto.
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
