import "server-only"

import { getCurrentUser } from "@/lib/auth/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

// Peças comuns da camada de acesso a dados (recomendação do Next 16: toda
// leitura e escrita passa por módulos server-only que conferem o usuário).
// O RLS do banco já isola os dados por usuário; o filtro explícito por user_id
// em cada consulta é a segunda barreira.

export class DataError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "DataError"
    this.code = code
  }
}

/**
 * Erro do Supabase → DataError com mensagem amigável, registrando no log do
 * servidor só o código e a mensagem técnica (sem `details`, que pode conter os
 * dados da linha).
 */
export function databaseError(scope, code, message, error) {
  console.error(`[data:${scope}] ${code}:`, error?.code ?? "?", error?.message ?? "")
  return new DataError(code, message)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ids vêm da URL: validar antes de consultar evita erro de tipo no Postgres. */
export function isUuid(value) {
  return UUID_RE.test(String(value))
}

/** Usuário logado + cliente Supabase da requisição; lança DataError se faltar algo. */
export async function getDataContext() {
  if (!isSupabaseConfigured()) {
    throw new DataError("not_configured", "Conecte o Supabase (.env.local) para salvar seus dados.")
  }
  const user = await getCurrentUser()
  if (!user) throw new DataError("unauthenticated", "Sua sessão expirou. Entre novamente.")
  return { user, supabase: await createClient() }
}

/**
 * Termo de busca seguro para o filtro `or` do PostgREST: remove os caracteres
 * da sintaxe do filtro (vírgula, parênteses…) e os curingas do ILIKE (% e _).
 * Testado em 2026-10-07 contra o PostgREST real: 27 caracteres especiais passam.
 */
export function sanitizeSearch(term) {
  return String(term ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 80)
}
