"use server"

import { revalidatePath } from "next/cache"

import { isTimestamp, parseInput, toFailure } from "@/lib/action-result"
import {
  createTemplateFromQuote,
  deleteQuoteTemplate,
  insertQuoteTemplate,
  updateQuoteTemplate,
} from "@/lib/data/quote-templates"
import { quoteTemplateSchema, templateNameSchema } from "@/lib/validations/quote-template"

// Server Actions dos modelos de orçamento (etapas 40 e 41). Podem ser chamadas
// direto por POST: a entrada é validada aqui com o mesmo schema do editor (o
// banco confere de novo os limites e o dono).
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

/** Cria um modelo pelo editor (`values`: valores do formulário, revalidados aqui). */
export async function createQuoteTemplateAction(values) {
  const { data, failure } = parseInput(quoteTemplateSchema, values)
  if (failure) return failure
  try {
    const id = await insertQuoteTemplate(data)
    revalidateTemplates()
    return { ok: true, id, name: data.name }
  } catch (error) {
    return toFailure("quote_templates", error)
  }
}

/**
 * Salva a edição de um modelo. `expectedUpdatedAt`: o updated_at lido ao abrir
 * o editor; se o modelo mudou depois (outra aba), o banco recusa (conflito).
 */
export async function updateQuoteTemplateAction(id, expectedUpdatedAt, values) {
  if (!isTimestamp(expectedUpdatedAt)) {
    return { ok: false, message: "Recarregue a página e tente de novo." }
  }
  const { data, failure } = parseInput(quoteTemplateSchema, values)
  if (failure) return failure
  try {
    await updateQuoteTemplate(id, expectedUpdatedAt, data)
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
