import "server-only"

import { getCurrentUser } from "@/lib/auth/server"
import { logError } from "@/lib/safe-log"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

// Peças comuns da camada de acesso a dados (recomendação do Next 16: toda
// leitura e escrita passa por módulos server-only que conferem o usuário).
// O RLS do banco já isola os dados por usuário; o filtro explícito por user_id
// em cada consulta é a segunda barreira.

/**
 * Erro com mensagem amigável (pt-BR) que pode ir para a tela. `field`: campo
 * do formulário a que a mensagem se refere (vira um fieldError da action).
 */
export class DataError extends Error {
  constructor(code, message, { field } = {}) {
    super(message)
    this.name = "DataError"
    this.code = code
    if (field) this.field = field
  }
}

/**
 * Erro do Supabase → DataError com mensagem amigável, registrando no log do
 * servidor só o código e a mensagem técnica (sem `details`, que pode conter os
 * dados da linha).
 */
export function databaseError(scope, code, message, error) {
  logError(`data:${scope}`, code, error, { stack: false })
  return new DataError(code, message)
}

// Ids vêm da URL: validar antes de consultar evita erro de tipo no Postgres.
export { isUuid } from "@/lib/uuid"

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
