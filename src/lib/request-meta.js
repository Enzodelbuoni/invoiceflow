import { isIP } from "node:net"

// Dados da requisição guardados como evidência auxiliar do aceite eletrônico
// (Sprint 15). Só no servidor (usa node:net). O IP vem do cabeçalho que a
// hospedagem preenche (x-forwarded-for na Vercel; o 1º endereço é o do
// visitante); sem um endereço válido, fica null em vez de um texto qualquer
// (a coluna é inet e recusaria).

const USER_AGENT_MAX = 500

/** IP de quem fez a requisição, ou null. `headers`: o objeto de `await headers()`. */
export function clientIp(headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const candidate = forwarded || headers.get("x-real-ip")?.trim()
  return candidate && isIP(candidate) ? candidate : null
}

/** Navegador (user-agent) com no máximo 500 caracteres, ou null. */
export function clientUserAgent(headers) {
  const userAgent = headers.get("user-agent")?.trim()
  // Corta por caractere (code point), como o Postgres conta, sem partir emojis ao meio.
  return userAgent ? [...userAgent].slice(0, USER_AGENT_MAX).join("") : null
}
