import { z } from "zod"

import { charLength, optionalText, requiredText } from "@/lib/validations/text"

// Resposta do cliente na página pública (Sprint 15): aprovar com aceite
// eletrônico (nome, e-mail e aceite dos termos) ou recusar (motivo opcional).
// Valida o formulário e é revalidado na Server Action. Os limites repetem os
// CHECKs da migração quote_responses (um teste confere).

export const QUOTE_RESPONSE_LIMITS = Object.freeze({
  signerNameMin: 2,
  signerNameMax: 120,
  signerEmailMax: 254,
  reason: 1000,
})

export const approveQuoteSchema = z.object({
  signer_name: requiredText({
    min: QUOTE_RESPONSE_LIMITS.signerNameMin,
    max: QUOTE_RESPONSE_LIMITS.signerNameMax,
    minError: "Digite seu nome completo.",
    maxError: `O nome pode ter no máximo ${QUOTE_RESPONSE_LIMITS.signerNameMax} caracteres.`,
  }),
  signer_email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value.length > 0, { error: "Informe seu e-mail.", abort: true })
    .refine((value) => z.email().safeParse(value).success, {
      error: "Digite um e-mail válido, como nome@empresa.com.",
      abort: true,
    })
    .refine((value) => charLength(value) <= QUOTE_RESPONSE_LIMITS.signerEmailMax, {
      error: `O e-mail pode ter no máximo ${QUOTE_RESPONSE_LIMITS.signerEmailMax} caracteres.`,
    }),
  accept_terms: z.literal(true, { error: "Para aprovar, confirme que leu e aceita a proposta." }),
})

export const declineQuoteSchema = z.object({
  reason: optionalText(QUOTE_RESPONSE_LIMITS.reason, "O motivo"),
})

/** Valores iniciais do aceite. O e-mail vem do cadastro do cliente, se houver (a pessoa pode trocar). */
export function emptyApproveForm({ email } = {}) {
  return { signer_name: "", signer_email: email ?? "", accept_terms: false }
}

export const EMPTY_DECLINE_FORM = Object.freeze({ reason: "" })
