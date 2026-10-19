import "server-only"
import { cache } from "react"

import { calculateQuoteTotals } from "@/lib/calculations/quote"
import { DataError, databaseError, getDataContext, isUuid } from "@/lib/data/shared"
import { todayIso } from "@/lib/dates"
import { toQuoteCopy } from "@/lib/quote-copy"
import { EMPTY_STATUS_COUNTS } from "@/lib/quote-list"
import { isSupabaseConfigured } from "@/lib/supabase/env"

// Camada de acesso a dados dos orçamentos (peças comuns em ./shared.js).
// Valores em inteiros como no banco: centavos, quantidade em centésimos e
// percentuais em pontos-base. Os bigint chegam como number: o teto
// (R$ 999.999.999,99) fica muito abaixo de Number.MAX_SAFE_INTEGER.

const QUOTE_COLUMNS = [
  "id, quote_number, status, client_id, title, description, valid_until",
  "discount_type, discount_value, tax_rate_bps, subtotal_cents, discount_total_cents, tax_total_cents, total_cents",
  "notes, terms, created_at, updated_at",
  "items:quote_items(position, service_id, name, description, quantity_hundredths, unit, unit_price_cents, subtotal_cents)",
].join(", ")

// Documento (QuotePreview): o orçamento + os dados do cliente e do emitente que
// aparecem na proposta. Só no servidor (a edição não recebe estes dados).
const DOCUMENT_COLUMNS = [
  QUOTE_COLUMNS,
  "public_id, sent_at",
  "client:clients(name, company, email, phone, document, address)",
  "issuer:profiles(full_name, email, phone)",
].join(", ")

/** Itens na ordem de position (o join do PostgREST não garante a ordem). */
const byPosition = (items) => [...items].sort((a, b) => a.position - b.position)

/**
 * Orçamento validado (saída do createQuoteSchema) → argumentos da função
 * create_quote do banco. Os totais são calculados AQUI, no servidor, com o
 * mesmo motor do resumo da tela: nunca vêm do navegador. O banco confere de
 * novo (CHECKs e a soma dos itens) e recusa qualquer número incoerente.
 */
export function toCreateQuoteParams(quote) {
  const totals = calculateQuoteTotals(quote)
  // O schema já barra valores acima do teto; isto só protege contra uso indevido.
  if (totals.total === null) {
    throw new DataError("invalid_totals", "Os valores do orçamento passam do limite permitido.")
  }

  const { items, ...fields } = quote
  return {
    p_quote: {
      ...fields,
      subtotal_cents: totals.subtotal,
      discount_total_cents: totals.discountTotal,
      tax_total_cents: totals.taxTotal,
      total_cents: totals.total,
    },
    p_items: items.map((item, index) => ({ ...item, subtotal_cents: totals.itemSubtotals[index] })),
  }
}

/**
 * Erro ao gravar um orçamento → DataError com mensagem amigável. Os casos que
 * a pessoa resolve sozinha ganham mensagem própria; o resto (incoerência dos
 * totais, falha de rede) vira mensagem genérica com o código no log.
 */
function quoteWriteError(error, fallback) {
  // 23503 = violação de FK: o registro sumiu (ou é de outro usuário) entre
  // abrir o construtor e salvar.
  if (error.code === "23503") {
    if (error.message?.includes("quotes_client_fkey")) {
      return new DataError("client_missing", "Este cliente não existe mais. Selecione outro.", { field: "client_id" })
    }
    if (error.message?.includes("quote_items_service_fkey")) {
      return new DataError(
        "service_missing",
        "Um serviço deste orçamento foi excluído do catálogo. Recarregue a página e recupere o rascunho: o item continua lá, como avulso.",
      )
    }
  }
  // Códigos levantados pelas próprias funções create_quote/update_quote e pelas
  // guardas de imutabilidade (migração update_quote).
  if (error.code === "28000") return new DataError("unauthenticated", "Sua sessão expirou. Entre novamente.")
  if (error.code === "P0002") return new DataError("not_found", "Orçamento não encontrado.")
  if (error.code === "55000") {
    return new DataError("not_editable", "Este orçamento já foi enviado e não pode mais ser editado.")
  }
  // PT409 (e não 40001: o PostgREST repete transações que falham com 40001).
  if (error.code === "PT409") {
    return new DataError(
      "conflict",
      "Este orçamento foi alterado em outra aba ou aparelho depois que você o abriu. Recarregue a página para ver a versão atual.",
    )
  }
  return databaseError("quotes", "write_failed", fallback, error)
}

/**
 * Cria o orçamento como rascunho, com número ("2026-001"), public_id e os
 * itens (snapshot), tudo numa transação só (função create_quote do banco).
 * `quote` já validado pelo createQuoteSchema.
 * @returns {Promise<{ id: string, quote_number: string }>}
 */
export async function insertQuote(quote) {
  const params = toCreateQuoteParams(quote)
  const { supabase } = await getDataContext()
  const { data, error } = await supabase.rpc("create_quote", params).single()
  if (error) throw quoteWriteError(error, "Não foi possível salvar o orçamento.")
  return data
}

/**
 * Salva a edição de um rascunho (função update_quote do banco): campos,
 * totais e itens numa transação só. `expectedUpdatedAt` é o updated_at lido
 * ao abrir a edição; se o orçamento mudou depois disso, o banco recusa.
 * `quote` já validado pelo createQuoteSchema.
 * @returns {Promise<{ id: string, quote_number: string }>}
 */
export async function updateQuote(id, expectedUpdatedAt, quote) {
  if (!isUuid(id)) throw new DataError("not_found", "Orçamento não encontrado.")
  const params = toCreateQuoteParams(quote)
  const { supabase } = await getDataContext()
  const { data, error } = await supabase
    .rpc("update_quote", { p_quote_id: id, p_expected_updated_at: expectedUpdatedAt, ...params })
    .single()
  if (error) throw quoteWriteError(error, "Não foi possível salvar as alterações.")
  return data
}

/**
 * Um orçamento do usuário com os itens em ordem, para a edição; `null` se não
 * existir (ou for de outra pessoa). `cache`: página e generateMetadata pedem o
 * mesmo orçamento na mesma requisição.
 */
export const getQuote = cache(async (id) => {
  if (!isUuid(id)) return null
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quotes")
    .select(QUOTE_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw databaseError("quotes", "query_failed", "Não foi possível carregar o orçamento.", error)
  if (!data) return null
  return { ...data, items: byPosition(data.items) }
})

/**
 * Tudo o que o documento do orçamento mostra: `{ quote, client, issuer }`, ou
 * `null` se não existir (ou for de outra pessoa). O emitente é o perfil do
 * usuário (os dados da empresa chegam com /settings/business).
 */
export const getQuoteDocument = cache(async (id) => {
  if (!isUuid(id)) return null
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quotes")
    .select(DOCUMENT_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw databaseError("quotes", "query_failed", "Não foi possível carregar o orçamento.", error)
  if (!data) return null
  const { client, issuer, ...quote } = data
  return {
    quote: { ...quote, items: byPosition(quote.items) },
    client,
    issuer: { name: issuer?.full_name || user.name, email: issuer?.email ?? user.email ?? null, phone: issuer?.phone ?? null },
  }
})

/**
 * Lista de orçamentos (Sprint 19) pela função list_quotes do banco: busca sem
 * acentos (número, título, cliente), status, período, ordenação e página numa
 * consulta só (argumentos montados por quoteListQuery, em lib/quote-list.js).
 * Modo demonstração → lista vazia.
 * @param {{ query?: string, statuses?: string[] | null, since?: Date | null, sort?: string,
 *   limit?: number, offset?: number }} [options]
 * @returns {Promise<{ counts: Record<string, number>, total: number, items: Array<{ id: string,
 *   public_id: string, quote_number: string, title: string, status: string, total_cents: number,
 *   valid_until: string, created_at: string, sent_at: string | null,
 *   client: { id: string, name: string, company: string | null, email: string | null, phone: string | null } }> }>}
 *   `counts`: por status, com a busca e o período (sem o filtro de status);
 *   `total`: resultados com todos os filtros (para a paginação).
 */
export async function listQuotes({ query = "", statuses = null, since = null, sort = "recent", limit = 20, offset = 0 } = {}) {
  if (!isSupabaseConfigured()) return { counts: { ...EMPTY_STATUS_COUNTS }, total: 0, items: [] }
  const { supabase } = await getDataContext()
  const { data, error } = await supabase.rpc("list_quotes", {
    p_query: query || null,
    p_statuses: statuses,
    p_since: since ? since.toISOString() : null,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw databaseError("quotes", "query_failed", "Não foi possível carregar os orçamentos.", error)
  return data
}

// ── Status (Sprint 12) ───────────────────────────────────────────────

/**
 * Erro de uma mudança de status → mensagem amigável. `invalidState`: a
 * mensagem do 55000 (o status atual não permite a ação), que muda por ação.
 */
function transitionError(error, { invalidState, fallback }) {
  if (error.code === "P0002") return new DataError("not_found", "Orçamento não encontrado.")
  if (error.code === "55000") return new DataError("invalid_state", invalidState)
  if (error.code === "28000") return new DataError("unauthenticated", "Sua sessão expirou. Entre novamente.")
  return databaseError("quotes", "transition_failed", fallback, error)
}

/** Rascunho → enviado (função send_quote: confere o status e a validade). */
export async function sendQuote(id) {
  if (!isUuid(id)) throw new DataError("not_found", "Orçamento não encontrado.")
  const { supabase } = await getDataContext()
  const { error } = await supabase.rpc("send_quote", { p_quote_id: id })
  if (!error) return
  if (error.code === "22023") {
    throw new DataError("validity_passed", "A validade deste orçamento já passou. Edite a data antes de enviar.")
  }
  throw transitionError(error, {
    invalidState: "Este orçamento já foi enviado.",
    fallback: "Não foi possível enviar o orçamento.",
  })
}

/** Rascunho, enviado ou visualizado → cancelado (função cancel_quote). */
export async function cancelQuote(id) {
  if (!isUuid(id)) throw new DataError("not_found", "Orçamento não encontrado.")
  const { supabase } = await getDataContext()
  const { error } = await supabase.rpc("cancel_quote", { p_quote_id: id })
  if (!error) return
  throw transitionError(error, {
    invalidState: "Este orçamento não pode mais ser cancelado.",
    fallback: "Não foi possível cancelar o orçamento.",
  })
}

/**
 * Exclui um RASCUNHO (o RLS só deixa excluir rascunhos; o que foi enviado é
 * histórico e sai do ar pelo cancelamento). Itens e eventos vão em cascata.
 */
export async function deleteQuote(id) {
  if (!isUuid(id)) throw new DataError("not_found", "Orçamento não encontrado.")
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle()
  if (error) throw databaseError("quotes", "delete_failed", "Não foi possível excluir o orçamento.", error)
  if (!data) {
    throw new DataError(
      "not_deletable",
      "Só rascunhos podem ser excluídos. Para tirar uma proposta enviada do ar, cancele-a.",
    )
  }
}

/** Linha do tempo de um orçamento (gravada por gatilho no banco), da mais antiga à mais nova. */
export async function listQuoteEvents(quoteId) {
  if (!isUuid(quoteId)) return []
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quote_events")
    .select("id, type, metadata, created_at")
    .eq("quote_id", quoteId)
    .eq("user_id", user.id)
    .order("created_at")
  if (error) throw databaseError("quotes", "query_failed", "Não foi possível carregar o histórico do orçamento.", error)
  return data
}

/**
 * Resposta do cliente (Sprint 15): o aceite eletrônico (nome, e-mail, IP,
 * navegador, data) ou a recusa (motivo), ou `null` se ainda não respondeu.
 * Gravada pelas funções da página pública; o dono só lê.
 */
export async function getQuoteResponse(quoteId) {
  if (!isUuid(quoteId)) return null
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quote_responses")
    .select("decision, signer_name, signer_email, reason, ip_address, user_agent, created_at")
    .eq("quote_id", quoteId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw databaseError("quotes", "query_failed", "Não foi possível carregar a resposta do cliente.", error)
  return data
}

/**
 * "Duplicar como novo rascunho" (Sprint 13): cria um orçamento NOVO (número
 * novo, rascunho) com o cliente, os itens e as condições do original e a
 * validade renovada. Grava pelo mesmo caminho do "salvar" (create_quote, com
 * os totais recalculados), então vale para qualquer status do original.
 * @returns {Promise<{ id: string, quote_number: string }>}
 */
export async function duplicateQuote(id) {
  const source = await getQuote(id)
  if (!source) throw new DataError("not_found", "Orçamento não encontrado.")
  return insertQuote(toQuoteCopy(source, { today: todayIso() }))
}
