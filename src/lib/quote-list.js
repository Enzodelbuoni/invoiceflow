// Lista de orçamentos (Sprint 19): filtros que ficam na URL, ordenação e
// paginação. Funções puras, testadas. A consulta em si é feita no banco
// (função list_quotes), que recebe os valores de quoteListQuery.
//
// URL: /quotes?q=…&status=…&periodo=…&ordem=…&pagina=…  (os valores padrão
// ficam fora da URL, então /quotes é a lista completa).

import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-status"
import { DASHBOARD_PERIODS, periodSince } from "@/lib/dashboard"
import { daysBetweenIso, describeDaysFromToday } from "@/lib/dates"

export const QUOTE_LIST_PAGE_SIZE = 20

/** Tamanho máximo da busca (o banco também corta em 100). */
export const QUOTE_SEARCH_MAX_LENGTH = 80

/**
 * Abas de status. "Em aberto" junta enviados e visualizados: os dois esperam a
 * resposta do cliente (o "aguardando resposta" do painel).
 */
export const QUOTE_STATUS_FILTERS = Object.freeze([
  { value: "todos", label: "Todos", statuses: null, empty: "Nenhum orçamento" },
  { value: "rascunhos", label: "Rascunhos", statuses: ["draft"], empty: "Nenhum rascunho" },
  {
    value: "em-aberto",
    label: "Em aberto",
    statuses: ["sent", "viewed"],
    empty: "Nenhum orçamento em aberto",
    description: "Enviados ou visualizados, aguardando a resposta do cliente",
  },
  { value: "aprovados", label: "Aprovados", statuses: ["approved"], empty: "Nenhum orçamento aprovado" },
  { value: "recusados", label: "Recusados", statuses: ["declined"], empty: "Nenhum orçamento recusado" },
  { value: "expirados", label: "Expirados", statuses: ["expired"], empty: "Nenhum orçamento expirado" },
  { value: "cancelados", label: "Cancelados", statuses: ["cancelled"], empty: "Nenhum orçamento cancelado" },
])

const PERIOD_LABELS = { tudo: "Qualquer data", "30d": "Últimos 30 dias", "90d": "Últimos 90 dias", "12m": "Últimos 12 meses" }

/**
 * Períodos (os mesmos do painel, pela data de envio ou, se nunca foi enviado,
 * pela de criação). Na lista o padrão é "qualquer data", que vem primeiro.
 */
export const QUOTE_LIST_PERIODS = Object.freeze(
  [...DASHBOARD_PERIODS]
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
    .map((period) => ({ value: period.value, label: PERIOD_LABELS[period.value], days: period.days })),
)

/** Ordenações; `sql` é o valor que a função list_quotes entende. */
export const QUOTE_SORTS = Object.freeze([
  { value: "recentes", label: "Mais recentes", sql: "recent" },
  { value: "antigos", label: "Mais antigos", sql: "oldest" },
  { value: "maior-valor", label: "Maior valor", sql: "value_desc" },
  { value: "menor-valor", label: "Menor valor", sql: "value_asc" },
  { value: "validade", label: "Validade mais próxima", sql: "valid_until" },
])

const DEFAULTS = Object.freeze({
  query: "",
  status: QUOTE_STATUS_FILTERS[0].value,
  period: QUOTE_LIST_PERIODS[0].value,
  sort: QUOTE_SORTS[0].value,
  page: 1,
})

/** Contagens zeradas, no formato que o banco devolve. */
export const EMPTY_STATUS_COUNTS = Object.freeze(Object.fromEntries(QUOTE_STATUS_VALUES.map((status) => [status, 0])))

// Parâmetro repetido (?status=a&status=b) chega como array: vale o padrão.
const single = (value) => (typeof value === "string" ? value : undefined)
const pick = (options, value, fallback) => options.find((option) => option.value === value)?.value ?? fallback

/**
 * searchParams da página → filtros normalizados. Qualquer valor inválido vira
 * o padrão; a página é um inteiro ≥ 1.
 * @param {Record<string, string | string[] | undefined>} searchParams
 * @returns {{ query: string, status: string, period: string, sort: string, page: number }}
 */
export function parseQuoteListParams(searchParams = {}) {
  const page = Number(single(searchParams.pagina))
  return {
    query: (single(searchParams.q) ?? "").trim().slice(0, QUOTE_SEARCH_MAX_LENGTH),
    status: pick(QUOTE_STATUS_FILTERS, single(searchParams.status), DEFAULTS.status),
    period: pick(QUOTE_LIST_PERIODS, single(searchParams.periodo), DEFAULTS.period),
    sort: pick(QUOTE_SORTS, single(searchParams.ordem), DEFAULTS.sort),
    page: Number.isSafeInteger(page) && page >= 1 ? page : DEFAULTS.page,
  }
}

export const findStatusFilter = (value) => QUOTE_STATUS_FILTERS.find((filter) => filter.value === value)
export const findListPeriod = (value) => QUOTE_LIST_PERIODS.find((period) => period.value === value)
export const findSort = (value) => QUOTE_SORTS.find((sort) => sort.value === value)

/** Filtros → argumentos da consulta (listQuotes / função list_quotes). */
export function quoteListQuery(params, now = new Date()) {
  return {
    query: params.query,
    statuses: findStatusFilter(params.status).statuses,
    since: periodSince(findListPeriod(params.period), now),
    sort: findSort(params.sort).sql,
    limit: QUOTE_LIST_PAGE_SIZE,
    offset: (params.page - 1) * QUOTE_LIST_PAGE_SIZE,
  }
}

/**
 * Link da lista com os filtros atuais + `changes`. Mudar qualquer filtro volta
 * para a página 1 (a página antiga pode nem existir no resultado novo). Os
 * valores padrão ficam fora da URL.
 */
export function quoteListHref(params, changes = {}) {
  const next = { ...params, page: DEFAULTS.page, ...changes }
  const search = new URLSearchParams()
  if (next.query) search.set("q", next.query)
  if (next.status !== DEFAULTS.status) search.set("status", next.status)
  if (next.period !== DEFAULTS.period) search.set("periodo", next.period)
  if (next.sort !== DEFAULTS.sort) search.set("ordem", next.sort)
  if (next.page !== DEFAULTS.page) search.set("pagina", String(next.page))
  const query = search.toString()
  return query ? `/quotes?${query}` : "/quotes"
}

/** Busca, status ou período diferentes do padrão (a ordenação não filtra). */
export function isFiltered(params) {
  return Boolean(params.query) || params.status !== DEFAULTS.status || params.period !== DEFAULTS.period
}

/** Link "Limpar filtros": tira busca, status e período e mantém a ordenação. */
export function clearFiltersHref(params) {
  return quoteListHref(params, { query: DEFAULTS.query, status: DEFAULTS.status, period: DEFAULTS.period })
}

/**
 * Título do "nenhum resultado" com o que foi pedido:
 * "Nenhum orçamento aprovado para “aurora” nos últimos 30 dias".
 */
export function emptyResultTitle(params) {
  const parts = [findStatusFilter(params.status).empty]
  if (params.query) parts.push(`para “${params.query}”`)
  const period = findListPeriod(params.period)
  if (period.days !== null) parts.push(`nos ${period.label.toLowerCase()}`)
  return parts.join(" ")
}

// Status em que a validade ainda importa: o rascunho precisa dela em dia para
// ser enviado; enviado/visualizado vence se o cliente não responder.
const VALIDITY_MATTERS = new Set(["draft", "sent", "viewed"])

/**
 * Dica ao lado da validade: "vence amanhã", "venceu há 3 dias"… `tone`:
 * "danger" (passou), "warning" (até 3 dias) ou "muted". Só nos status em que
 * a validade ainda importa; nos outros, null.
 * @param {{ status: string, valid_until: string }} quote
 * @param {string} today "AAAA-MM-DD" (do servidor, fuso de SP)
 */
export function validityHint(quote, today) {
  if (!VALIDITY_MATTERS.has(quote.status)) return null
  const days = daysBetweenIso(today, quote.valid_until)
  if (Number.isNaN(days)) return null
  if (days < 0) return { text: `venceu ${describeDaysFromToday(days)}`, tone: "danger" }
  return { text: `vence ${describeDaysFromToday(days)}`, tone: days <= 3 ? "warning" : "muted" }
}

/** Quantos orçamentos a aba teria (soma dos status dela; "Todos" = todos). */
export function statusFilterCount(filter, counts) {
  const statuses = filter.statuses ?? QUOTE_STATUS_VALUES
  return statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0)
}

/** Número de páginas (pelo menos 1, mesmo sem resultados). */
export function pageCount(total, size = QUOTE_LIST_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / size))
}

/** Posição dos itens mostrados: página 2 de 57 → { from: 21, to: 40 }. */
export function pageRange(page, total, size = QUOTE_LIST_PAGE_SIZE) {
  if (total === 0) return { from: 0, to: 0 }
  return { from: (page - 1) * size + 1, to: Math.min(page * size, total) }
}

/**
 * Botões da paginação: primeira, última, a atual e as vizinhas, com "gap" no
 * lugar das que ficam de fora. Um "gap" que esconderia uma página só vira a
 * própria página (não faz sentido "…" no lugar de um número).
 * 10 páginas, na 5 → [1, "gap-start", 4, 5, 6, "gap-end", 10].
 * @returns {Array<number | "gap-start" | "gap-end">}
 */
export function paginationItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1)

  const start = Math.max(2, Math.min(page - 1, pages - 4))
  const end = Math.min(pages - 1, Math.max(page + 1, 5))
  const items = [1]
  if (start > 3) items.push("gap-start")
  else for (let n = 2; n < start; n++) items.push(n)
  for (let n = start; n <= end; n++) items.push(n)
  if (end < pages - 2) items.push("gap-end")
  else for (let n = end + 1; n < pages; n++) items.push(n)
  items.push(pages)
  return items
}
