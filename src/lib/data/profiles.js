import "server-only"
import { cache } from "react"

import { databaseError, getDataContext } from "@/lib/data/shared"
import { isSupabaseConfigured } from "@/lib/supabase/env"

// Perfil do usuário logado. Por enquanto é ele o emitente das propostas (os
// dados da empresa/freelancer chegam com /settings/business).

/**
 * Emitente das propostas: `{ name, email, phone }` do perfil, com o nome de
 * exibição do usuário quando o perfil não tem nome.
 */
export const getIssuer = cache(async () => {
  if (!isSupabaseConfigured()) return { name: "Você", email: null, phone: null }
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw databaseError("profiles", "query_failed", "Não foi possível carregar o seu perfil.", error)
  return { name: data?.full_name || user.name, email: data?.email ?? user.email ?? null, phone: data?.phone ?? null }
})
