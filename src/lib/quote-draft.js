import { DISCOUNT_TYPE_VALUES } from "@/lib/constants/discount-types"
import { SERVICE_UNIT_VALUES } from "@/lib/constants/service-units"
import { QUOTE_LIMITS, createEmptyQuoteForm, createQuoteItem } from "@/lib/validations/quote"

// Rascunho local do construtor (Sprint 9): os valores do formulário guardados
// no navegador enquanto o orçamento não é salvo, para não perder o trabalho se
// a aba fechar. Aqui ficam as regras puras; o armazenamento é o store Zustand
// (src/store/quote-draft-store.js).

/** Rascunhos mais velhos que isso são descartados. */
export const QUOTE_DRAFT_MAX_AGE_DAYS = 30

const DAY_MS = 86_400_000

/** O rascunho passou da idade máxima (ou a data é inválida)? */
export function isDraftExpired(savedAt, now = new Date()) {
  const time = new Date(savedAt).getTime()
  if (Number.isNaN(time)) return true
  return now.getTime() - time > QUOTE_DRAFT_MAX_AGE_DAYS * DAY_MS
}

/** Igualdade profunda para valores de formulário (objetos, arrays, texto, booleanos). */
function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => deepEqual(a[key], b[key]))
}

/**
 * Chave do rascunho local: por usuário no "Novo orçamento" e por usuário +
 * orçamento na edição (cada orçamento editado tem a própria cópia).
 */
export function quoteDraftKey(userId, quoteId) {
  return quoteId ? `${userId}:${quoteId}` : userId
}

/**
 * Há algo diferente da versão de partida? `base`: o orçamento em branco (novo)
 * ou a versão salva no banco (edição). Um formulário intocado não vira
 * rascunho; e desfazer tudo de volta remove o rascunho.
 */
export function hasDraftContent(values, base) {
  return !deepEqual(values, base)
}

const text = (value, fallback = "") => (typeof value === "string" ? value : fallback)

/**
 * Valores guardados → valores seguros para o formulário (form.reset). O que foi
 * guardado pode ser de uma versão antiga do app ou estar desatualizado:
 * - campos que faltam recebem o valor inicial; tipos errados são trocados;
 * - cliente que não existe mais (excluído) é desmarcado;
 * - item cujo serviço foi excluído vira avulso (o snapshot continua: nome,
 *   descrição, unidade e preço); unidade desconhecida volta à padrão;
 * - no máximo QUOTE_LIMITS.items itens.
 * A validade é mantida como estava (se ficou no passado, o schema avisa).
 *
 * @param {object} values valores guardados
 * @param {{ today: string, clientIds: Set<string>, serviceIds: Set<string> }} context
 */
export function sanitizeDraftValues(values, { today, clientIds, serviceIds }) {
  const empty = createEmptyQuoteForm({ today })
  const source = values && typeof values === "object" ? values : {}
  const blankItem = createQuoteItem()

  const items = (Array.isArray(source.items) ? source.items : []).slice(0, QUOTE_LIMITS.items).map((raw) => {
    const item = raw && typeof raw === "object" ? raw : {}
    const serviceId = text(item.service_id)
    return {
      service_id: serviceIds.has(serviceId) ? serviceId : "",
      name: text(item.name),
      description: text(item.description),
      quantity: text(item.quantity, blankItem.quantity),
      unit: SERVICE_UNIT_VALUES.includes(item.unit) ? item.unit : blankItem.unit,
      unit_price: text(item.unit_price),
    }
  })

  const clientId = text(source.client_id)
  return {
    client_id: clientIds.has(clientId) ? clientId : "",
    title: text(source.title),
    description: text(source.description),
    valid_until: text(source.valid_until, empty.valid_until) || empty.valid_until,
    items,
    discount_type: DISCOUNT_TYPE_VALUES.includes(source.discount_type) ? source.discount_type : empty.discount_type,
    discount_value: text(source.discount_value),
    tax_enabled: typeof source.tax_enabled === "boolean" ? source.tax_enabled : empty.tax_enabled,
    tax_rate: text(source.tax_rate),
    notes: text(source.notes),
    terms: text(source.terms),
  }
}
