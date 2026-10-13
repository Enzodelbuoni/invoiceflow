import "server-only"
import { cache } from "react"

import { databaseError } from "@/lib/data/shared"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"
import { isUuid } from "@/lib/uuid"

// Acesso da página pública da proposta (/quote/<public_id>, sem login). Nada de
// tabela aberta: as funções do banco recebem o public_id e devolvem só o
// necessário (migração public_quote_access). O cliente do Supabase usa os
// cookies da requisição: se quem abre é o próprio dono logado, o banco sabe e
// não conta a visualização.

/**
 * A proposta pública: `{ quote, client, issuer }` (formato do QuotePreview), ou
 * `null` se o id não existir ou for de um rascunho. Cancelada: só número,
 * status e título.
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
