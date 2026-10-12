import "server-only"
import { cache } from "react"

import { DataError, databaseError, getDataContext, isUuid, sanitizeSearch } from "@/lib/data/shared"
import { isSupabaseConfigured } from "@/lib/supabase/env"

// Camada de acesso a dados dos serviços (peças comuns em ./shared.js).
// price_cents chega como number: bigint no banco, mas o teto (R$ 99.999.999,99)
// fica muito abaixo de Number.MAX_SAFE_INTEGER, então o JSON não perde precisão.

const COLUMNS = "id, name, description, unit, price_cents, created_at, updated_at"

/** Serviços do usuário, em ordem alfabética; `query` busca no nome e na descrição. */
export async function listServices({ query = "" } = {}) {
  if (!isSupabaseConfigured()) return []
  const { user, supabase } = await getDataContext()

  let request = supabase.from("services").select(COLUMNS).eq("user_id", user.id).order("name")
  const term = sanitizeSearch(query)
  if (term) {
    request = request.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
  }

  const { data, error } = await request
  if (error) throw databaseError("services", "query_failed", "Não foi possível carregar os serviços.", error)
  return data
}

/**
 * Serviços para o catálogo do orçamento: só o que o item copia (snapshot) e a
 * lista mostra, em ordem alfabética.
 */
export async function listServiceOptions() {
  if (!isSupabaseConfigured()) return []
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, unit, price_cents")
    .eq("user_id", user.id)
    .order("name")
  if (error) throw databaseError("services", "query_failed", "Não foi possível carregar os serviços.", error)
  return data
}

/**
 * Um serviço do usuário, ou `null` se não existir (ou for de outra pessoa).
 * `cache`: página e generateMetadata pedem o mesmo serviço na mesma requisição.
 */
export const getService = cache(async (id) => {
  if (!isUuid(id)) return null
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("services")
    .select(COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw databaseError("services", "query_failed", "Não foi possível carregar o serviço.", error)
  return data
})

/** `values` já validados pelo serviceSchema ({ name, description, unit, price_cents }). */
export async function insertService(values) {
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("services")
    .insert({ ...values, user_id: user.id })
    .select("id")
    .single()
  if (error) throw databaseError("services", "insert_failed", "Não foi possível salvar o serviço.", error)
  return data
}

export async function updateService(id, values) {
  if (!isUuid(id)) throw new DataError("not_found", "Serviço não encontrado.")
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("services")
    .update(values)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()
  if (error) throw databaseError("services", "update_failed", "Não foi possível salvar as alterações.", error)
  if (!data) throw new DataError("not_found", "Serviço não encontrado.")
  return data
}

/**
 * Exclusão real e sempre permitida: os itens de orçamento guardam uma cópia
 * (snapshot) do serviço, e quote_items.service_id será ON DELETE SET NULL.
 */
export async function deleteService(id) {
  if (!isUuid(id)) throw new DataError("not_found", "Serviço não encontrado.")
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()
  if (error) throw databaseError("services", "delete_failed", "Não foi possível excluir o serviço.", error)
  if (!data) throw new DataError("not_found", "Serviço não encontrado.")
}
