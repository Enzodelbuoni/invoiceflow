import "server-only"

import { calculateQuoteTotals } from "@/lib/calculations/quote"
import { DataError, databaseError, getDataContext } from "@/lib/data/shared"
import { isSupabaseConfigured } from "@/lib/supabase/env"

// Camada de acesso a dados dos orçamentos (peças comuns em ./shared.js).
// Valores em inteiros como no banco: centavos, quantidade em centésimos e
// percentuais em pontos-base. Os bigint chegam como number: o teto
// (R$ 999.999.999,99) fica muito abaixo de Number.MAX_SAFE_INTEGER.

const LIST_COLUMNS =
  "id, quote_number, title, status, total_cents, valid_until, created_at, client:clients(id, name, company)"

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
  // 28000 = sessão inválida (levantado pela própria função create_quote).
  if (error.code === "28000") return new DataError("unauthenticated", "Sua sessão expirou. Entre novamente.")
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

/** Orçamentos do usuário, mais recentes primeiro, com o nome do cliente. */
export async function listQuotes() {
  if (!isSupabaseConfigured()) return []
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quotes")
    .select(LIST_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) throw databaseError("quotes", "query_failed", "Não foi possível carregar os orçamentos.", error)
  return data
}
