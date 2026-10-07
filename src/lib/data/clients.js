import "server-only"
import { cache } from "react"

import { DataError, getDataContext, isUuid, sanitizeSearch } from "@/lib/data/shared"
import { isSupabaseConfigured } from "@/lib/supabase/env"

// Camada de acesso a dados dos clientes (peças comuns em ./shared.js).

const COLUMNS = "id, name, email, phone, company, document, address, notes, created_at, updated_at"

/** Clientes do usuário, em ordem alfabética; `query` busca em nome, empresa e e-mail. */
export async function listClients({ query = "" } = {}) {
  if (!isSupabaseConfigured()) return []
  const { user, supabase } = await getDataContext()

  let request = supabase.from("clients").select(COLUMNS).eq("user_id", user.id).order("name")
  const term = sanitizeSearch(query)
  if (term) {
    request = request.or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const { data, error } = await request
  if (error) throw new DataError("query_failed", "Não foi possível carregar os clientes.")
  return data
}

/**
 * Um cliente do usuário, ou `null` se não existir (ou for de outra pessoa).
 * `cache`: página e generateMetadata pedem o mesmo cliente na mesma requisição.
 */
export const getClient = cache(async (id) => {
  if (!isUuid(id)) return null
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("clients")
    .select(COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw new DataError("query_failed", "Não foi possível carregar o cliente.")
  return data
})

/** `values` já validados pelo clientSchema. */
export async function insertClient(values) {
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...values, user_id: user.id })
    .select("id")
    .single()
  if (error) throw new DataError("insert_failed", "Não foi possível salvar o cliente.")
  return data
}

export async function updateClient(id, values) {
  if (!isUuid(id)) throw new DataError("not_found", "Cliente não encontrado.")
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("clients")
    .update(values)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()
  if (error) throw new DataError("update_failed", "Não foi possível salvar as alterações.")
  if (!data) throw new DataError("not_found", "Cliente não encontrado.")
  return data
}

export async function deleteClient(id) {
  if (!isUuid(id)) throw new DataError("not_found", "Cliente não encontrado.")
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()
  if (error) {
    // 23503 = violação de FK: o cliente tem orçamentos (a partir do Sprint 10).
    if (error.code === "23503") {
      throw new DataError("has_quotes", "Este cliente tem orçamentos e não pode ser excluído.")
    }
    throw new DataError("delete_failed", "Não foi possível excluir o cliente.")
  }
  if (!data) throw new DataError("not_found", "Cliente não encontrado.")
}
