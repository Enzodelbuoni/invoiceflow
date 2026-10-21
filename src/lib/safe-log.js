// Registro de erros no log do servidor (Sprint 22, "logs seguros"). Vai para o
// log só o que ajuda a achar o defeito: tipo, código, mensagem curta, `digest`
// e as linhas da pilha. Ficam de fora os outros campos do erro, que podem
// trazer dados das pessoas (o `details` do Postgres traz a linha recusada; um
// erro de rede pode trazer cabeçalhos e corpo do pedido), e a mensagem passa
// por uma limpeza de e-mails, tokens e chaves.

const MAX_MESSAGE = 300
const MAX_FRAMES = 6
const MAX_CAUSES = 2

const REDACTIONS = [
  [/\beyJ[\w-]*\.[\w-]+\.[\w-]+/g, "[token]"], // JWT (sessão do Supabase)
  [/\bsb_(?:secret|publishable)_[\w-]+/g, "[chave]"], // chaves do Supabase
  [/\bBearer\s+[\w.~+/-]+=*/gi, "Bearer [token]"],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[e-mail]"],
]

/** Texto sem e-mails, tokens e chaves. */
export function redact(text) {
  return REDACTIONS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), String(text))
}

function clip(text) {
  return text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE)}…` : text
}

// Só as linhas "at …" (a primeira linha da pilha repete a mensagem sem limpeza).
function stackFrames(stack) {
  if (typeof stack !== "string") return []
  return stack
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at "))
    .slice(0, MAX_FRAMES)
}

/**
 * Resumo seguro de um erro para o log. `stack: false` para erros cuja pilha não
 * diz nada (os do Supabase nascem dentro da biblioteca).
 */
export function describeError(error, { stack = true } = {}, depth = 0) {
  if (error === null || typeof error !== "object") {
    return { message: clip(redact(String(error))) }
  }
  const info = {}
  if (typeof error.name === "string" && error.name) info.name = error.name
  if (typeof error.code === "string" || typeof error.code === "number") info.code = String(error.code)
  info.message = typeof error.message === "string" ? clip(redact(error.message)) : ""
  if (typeof error.digest === "string") info.digest = error.digest
  const frames = stack ? stackFrames(error.stack) : []
  if (frames.length) info.stack = frames
  if (error.cause != null && depth < MAX_CAUSES) info.cause = describeError(error.cause, { stack: false }, depth + 1)
  return info
}

/** console.error com o resumo seguro: "[escopo] o que houve: { name, code, message, … }". */
export function logError(scope, label, error, options) {
  console.error(`[${scope}] ${label}:`, describeError(error, options))
}
