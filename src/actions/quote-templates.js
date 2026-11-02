"use server"

import { revalidatePath } from "next/cache"

import { parseInput, toFailure } from "@/lib/action-result"
import { createTemplateFromQuote, deleteQuoteTemplate } from "@/lib/data/quote-templates"
import { templateNameSchema } from "@/lib/validations/quote-template"

// Server Actions dos modelos de orçamento (etapa 40). Podem ser chamadas
// direto por POST: a entrada é validada aqui e o conteúdo do modelo é lido no
// servidor (nunca vem do navegador).
// Retorno: { ok: true, id, name } ou { ok: false, message, fieldErrors? }.

/** Modelos aparecem na lista e no seletor do construtor. */
function revalidateTemplates() {
  revalidatePath("/templates")
  revalidatePath("/quotes/new")
}

/** "Salvar como modelo" a partir de um orçamento (`values`: { name }). */
export async function saveQuoteAsTemplateAction(quoteId, values) {
  const { data, failure } = parseInput(templateNameSchema, values)
  if (failure) return failure
  try {
    const id = await createTemplateFromQuote(quoteId, data.name)
    revalidateTemplates()
    return { ok: true, id, name: data.name }
  } catch (error) {
    return toFailure("quote_templates", error)
  }
}

/** Exclui um modelo (os orçamentos criados com ele não mudam). */
export async function deleteQuoteTemplateAction(id) {
  try {
    await deleteQuoteTemplate(id)
    revalidateTemplates()
    return { ok: true }
  } catch (error) {
    return toFailure("quote_templates", error)
  }
}
