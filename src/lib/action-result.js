import "server-only"

import { DataError } from "@/lib/data/shared"
import { logError } from "@/lib/safe-log"

// Formato de retorno das Server Actions:
//   { ok: true, id? }  ou  { ok: false, message, code?, fieldErrors? }
// Nunca devolve erros técnicos ao navegador: só mensagens em pt-BR e, nos
// erros previstos, o código do DataError (ex.: "unauthenticated" = sessão
// expirada, que o navegador trata com o aviso "Entrar novamente").

const UNEXPECTED = "Algo deu errado. Tente novamente em instantes."

/**
 * Revalida a entrada com o schema (a action pode ser chamada direto por POST).
 * Devolve { data } ou { failure } com a primeira mensagem de cada campo.
 * Campos aninhados viram caminhos com pontos, como o React Hook Form usa
 * ("items.0.name"); erros sem campo (raiz) ficam só na mensagem geral.
 */
export function parseInput(schema, values) {
  const result = schema.safeParse(values)
  if (result.success) return { data: result.data }
  const fieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join(".")
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message
  }
  return { failure: { ok: false, message: "Confira os campos destacados.", fieldErrors } }
}

/**
 * Erro → resposta amigável; o que não for DataError vai para o log do servidor
 * pelo resumo seguro (`logError`), nunca o objeto inteiro.
 */
export function toFailure(scope, error) {
  if (error instanceof DataError) {
    const failure = { ok: false, message: error.message, code: error.code }
    if (error.field) failure.fieldErrors = { [error.field]: error.message }
    return failure
  }
  logError(scope, "erro inesperado", error)
  return { ok: false, message: UNEXPECTED }
}
