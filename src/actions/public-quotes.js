"use server"

import { headers } from "next/headers"

import { parseInput, toFailure } from "@/lib/action-result"
import { approveQuote, declineQuote, registerQuoteView } from "@/lib/data/public-quotes"
import { DataError } from "@/lib/data/shared"
import { clientIp, clientUserAgent } from "@/lib/request-meta"
import { approveQuoteSchema, declineQuoteSchema } from "@/lib/validations/quote-response"

// Server Actions da página pública da proposta (sem login). O banco confere
// tudo pelo public_id (status, validade, quem responde); aqui só revalidamos a
// entrada (a action pode ser chamada direto por POST).

/**
 * Chamada pelo navegador depois que a página pública carrega (robôs de prévia
 * de link não executam JavaScript, então não marcam visualização).
 */
export async function registerQuoteViewAction(publicId) {
  try {
    await registerQuoteView(publicId)
    return { ok: true }
  } catch (error) {
    return toFailure("public-quotes", error)
  }
}

/** IP e navegador de quem respondeu (evidência auxiliar do aceite). */
async function requestMeta() {
  const requestHeaders = await headers()
  return { ip: clientIp(requestHeaders), userAgent: clientUserAgent(requestHeaders) }
}

// A página estava desatualizada (outra pessoa respondeu, a validade venceu, a
// proposta saiu do ar): a tela recarrega para mostrar a situação atual.
const STALE_CODES = new Set(["already_answered", "expired", "not_found"])

function responseFailure(error) {
  const failure = toFailure("public-quotes", error)
  return error instanceof DataError && STALE_CODES.has(error.code) ? { ...failure, stale: true } : failure
}

/**
 * Aprova a proposta com o aceite eletrônico (nome, e-mail, aceite dos termos).
 * Retorno: { ok: true, respondedAt } ou { ok: false, message, fieldErrors?, stale? }
 * (`stale`: a página precisa ser recarregada).
 */
export async function approveQuoteAction(publicId, values) {
  const { data, failure } = parseInput(approveQuoteSchema, values)
  if (failure) return failure
  try {
    const respondedAt = await approveQuote(publicId, data, await requestMeta())
    return { ok: true, respondedAt }
  } catch (error) {
    return responseFailure(error)
  }
}

/** Recusa a proposta (motivo opcional). Mesmo retorno da aprovação. */
export async function declineQuoteAction(publicId, values) {
  const { data, failure } = parseInput(declineQuoteSchema, values)
  if (failure) return failure
  try {
    const respondedAt = await declineQuote(publicId, data, await requestMeta())
    return { ok: true, respondedAt }
  } catch (error) {
    return responseFailure(error)
  }
}
