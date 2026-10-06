import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"

import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

// Usuário fictício do modo demonstração (sem .env.local).
const DEMO_USER = { id: "demo", name: "Freelancer Demo", email: "voce@exemplo.com" }

/**
 * Usuário logado ou `null`. Valida o JWT com getClaims() (nunca getSession(),
 * que não é confiável para autorização). `cache` evita repetir a consulta
 * quando layout e página pedem o usuário na mesma requisição.
 */
export const getCurrentUser = cache(async () => {
  if (!isSupabaseConfigured()) return DEMO_USER

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", claims.sub)
    .maybeSingle()

  return {
    id: claims.sub,
    email: claims.email,
    // Só para exibição: o nome do perfil, ou o informado no cadastro, ou o início do e-mail.
    name: profile?.full_name || claims.user_metadata?.full_name || claims.email?.split("@")[0] || "Você",
  }
})

/** Para páginas da área privada: devolve o usuário ou manda para /login. */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}
