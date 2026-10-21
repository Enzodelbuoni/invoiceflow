import "server-only"
import { cache } from "react"

import { getCurrentUser } from "@/lib/auth/server"
import { databaseError, getDataContext } from "@/lib/data/shared"
import { toIssuer } from "@/lib/issuer"
import { isSupabaseConfigured } from "@/lib/supabase/env"

// Perfil do usuário logado (a pessoa) e o emitente das propostas, que junta o
// perfil com os dados do negócio (tabela businesses, etapa 38).

const BUSINESS_COLUMNS = "name, legal_name, document, email, phone, website, address"

/** `{ full_name, email, phone }` do usuário logado. */
export const getProfile = cache(async () => {
  if (!isSupabaseConfigured()) {
    const user = await getCurrentUser()
    return { full_name: user.name, email: user.email, phone: null }
  }
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw databaseError("profiles", "query_failed", "Não foi possível carregar o seu perfil.", error)
  return { full_name: data?.full_name ?? "", email: data?.email ?? user.email ?? null, phone: data?.phone ?? null }
})

/** `values` já validados pelo profileSchema (o banco só deixa mudar nome e telefone). */
export async function updateProfile(values) {
  const { user, supabase } = await getDataContext()
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: values.full_name, phone: values.phone })
    .eq("id", user.id)
  if (error) throw databaseError("profiles", "update_failed", "Não foi possível salvar o seu perfil.", error)
}

/** Dados do negócio, ou `null` enquanto o usuário nunca salvou a tela. */
export const getBusiness = cache(async () => {
  if (!isSupabaseConfigured()) return null
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw databaseError("businesses", "query_failed", "Não foi possível carregar os dados do negócio.", error)
  return data
})

/** `values` já validados pelo businessSchema. Cria a linha no primeiro "Salvar". */
export async function saveBusiness(values) {
  const { user, supabase } = await getDataContext()
  const { error } = await supabase.from("businesses").upsert({ ...values, user_id: user.id }, { onConflict: "user_id" })
  if (error) throw databaseError("businesses", "save_failed", "Não foi possível salvar os dados do negócio.", error)
}

/**
 * Emitente das propostas (formato do QuotePreview): o negócio, com o perfil
 * no lugar do que estiver em branco. Ver `toIssuer` (lib/issuer.js).
 */
export const getIssuer = cache(async () => {
  if (!isSupabaseConfigured()) return toIssuer({ fallbackName: "Você" })
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("profiles")
    .select(`full_name, email, phone, business:businesses(${BUSINESS_COLUMNS})`)
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw databaseError("profiles", "query_failed", "Não foi possível carregar o seu perfil.", error)
  const { business, ...profile } = data ?? {}
  return toIssuer({ profile: { ...profile, email: profile.email ?? user.email }, business, fallbackName: user.name })
})
