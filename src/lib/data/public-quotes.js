import "server-only"
import { cache } from "react"

import { DataError, databaseError } from "@/lib/data/shared"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { isUuid } from "@/lib/uuid"

// Acesso da página pública da proposta (/quote/<public_id>, sem login). Nada de
// tabela aberta: as funções do banco recebem o public_id e devolvem só o
// necessário (migração public_quote_access). O cliente do Supabase usa os
// cookies da requisição: se quem abre é o próprio dono logado, o banco sabe e
// não conta a visualização.

/**
 * A proposta pública: `{ quote, client, issuer, response, viewer_is_owner }`
 * (quote/client/issuer no formato do QuotePreview), ou `null` se o id não
 * existir ou for de um rascunho. Cancelada: só número, status e título.
 * `response`: `{ decision, signer_name, responded_at }` depois que o cliente
 * respondeu; `viewer_is_owner`: quem abriu é o próprio dono (logado).
 */
export const getPublicQuote = cache(async (publicId) => {
  if (!isUuid(publicId) || !isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_public_quote", { p_public_id: publicId })
  if (error) throw databaseError("public-quotes", "query_failed", "Não foi possível carregar a proposta.", error)
  return data ?? null
})

/** Primeira visita do cliente: enviado → visualizado (o banco decide se conta). */
export async function registerQuoteView(publicId) {
  if (!isUuid(publicId) || !isSupabaseConfigured()) return
  const supabase = await createClient()
  const { error } = await supabase.rpc("register_quote_view", { p_public_id: publicId })
  if (error) throw databaseError("public-quotes", "view_failed", "Não foi possível registrar a visualização.", error)
}

/**
 * Registra "PDF baixado" no histórico (Sprint 16). O banco decide se foi o
 * cliente ou o dono e ignora repetições do mesmo lado em 10 minutos.
 */
export async function registerQuoteDownload(publicId) {
  if (!isUuid(publicId) || !isSupabaseConfigured()) return
  const supabase = await createClient()
  const { error } = await supabase.rpc("register_quote_download", { p_public_id: publicId })
  if (error) throw databaseError("public-quotes", "download_failed", "Não foi possível registrar o download.", error)
}

// ── Resposta do cliente (Sprint 15) ──────────────────────────────────

const NOT_FOUND = "Esta proposta não foi encontrada."

/**
 * Erro ao responder → mensagem para quem está respondendo. O banco confere de
 * novo o status, a validade e quem responde (migração quote_responses), então
 * estes casos acontecem quando a página estava aberta havia algum tempo.
 */
function responseError(error, fallback) {
  if (error.code === "P0002") return new DataError("not_found", NOT_FOUND)
  if (error.code === "55000") {
    return new DataError("already_answered", "Esta proposta já foi respondida ou cancelada. Veja a situação atual na página.")
  }
  if (error.code === "22023") {
    return new DataError("expired", "O prazo desta proposta terminou. Peça uma proposta atualizada a quem a enviou.")
  }
  if (error.code === "PT403") {
    return new DataError("owner", "Você enviou esta proposta. Só o cliente pode aprová-la ou recusá-la.")
  }
  if (error.code === "23514") return new DataError("invalid", "Confira os dados informados e tente de novo.")
  return databaseError("public-quotes", "response_failed", fallback, error)
}

/** Cliente do Supabase da requisição (anônimo ou logado) para responder à proposta. */
async function responseClient(publicId) {
  if (!isUuid(publicId)) throw new DataError("not_found", NOT_FOUND)
  if (!isSupabaseConfigured()) {
    throw new DataError("not_configured", "Conecte o Supabase (.env.local) para responder a propostas.")
  }
  return createClient()
}

/**
 * Aprova a proposta com o aceite eletrônico (enviada/visualizada → aprovada).
 * `response` já validado pelo approveQuoteSchema; `meta`: IP e navegador de
 * quem aceitou (evidência auxiliar, podem ser null).
 * @returns {Promise<string>} data/hora do aceite (do banco)
 */
export async function approveQuote(publicId, response, { ip = null, userAgent = null } = {}) {
  const supabase = await responseClient(publicId)
  const { data, error } = await supabase.rpc("approve_quote", {
    p_public_id: publicId,
    p_signer_name: response.signer_name,
    p_signer_email: response.signer_email,
    p_accept_terms: response.accept_terms,
    p_ip_address: ip,
    p_user_agent: userAgent,
  })
  if (error) throw responseError(error, "Não foi possível registrar a aprovação.")
  return data
}

/**
 * Recusa a proposta (enviada/visualizada → recusada), com o motivo opcional.
 * `response` já validado pelo declineQuoteSchema.
 * @returns {Promise<string>} data/hora da recusa (do banco)
 */
export async function declineQuote(publicId, response, { ip = null, userAgent = null } = {}) {
  const supabase = await responseClient(publicId)
  const { data, error } = await supabase.rpc("decline_quote", {
    p_public_id: publicId,
    p_reason: response.reason,
    p_ip_address: ip,
    p_user_agent: userAgent,
  })
  if (error) throw responseError(error, "Não foi possível registrar a recusa.")
  return data
}
