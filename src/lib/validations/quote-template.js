import { z } from "zod"

import { requiredText } from "@/lib/validations/text"

// Modelos de orçamento (etapa 40): limites e schemas. A migração
// quote_templates repete estes limites (um teste confere lendo o SQL); os
// limites do conteúdo (itens, textos, valores) são os do orçamento (QUOTE_LIMITS).

export const QUOTE_TEMPLATE_LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 80,
})

const templateName = requiredText({
  min: QUOTE_TEMPLATE_LIMITS.nameMin,
  max: QUOTE_TEMPLATE_LIMITS.nameMax,
  minError: "Dê um nome ao modelo.",
  maxError: `O nome pode ter no máximo ${QUOTE_TEMPLATE_LIMITS.nameMax} caracteres.`,
})

/** "Salvar como modelo": só o nome (o conteúdo vem do orçamento, lido no servidor). */
export const templateNameSchema = z.object({ name: templateName })
