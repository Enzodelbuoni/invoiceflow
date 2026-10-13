"use server"

import { toFailure } from "@/lib/action-result"
import { registerQuoteView } from "@/lib/data/public-quotes"

// Server Actions da página pública da proposta (sem login). O banco confere
// tudo pelo public_id; aqui não há dado do usuário para validar.

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
