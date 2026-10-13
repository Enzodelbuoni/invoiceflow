"use server"

import { revalidatePath } from "next/cache"

import { parseInput, toFailure } from "@/lib/action-result"
import { cancelQuote, deleteQuote, duplicateQuote, insertQuote, sendQuote, updateQuote } from "@/lib/data/quotes"
import { todayIso } from "@/lib/dates"
import { createQuoteSchema } from "@/lib/validations/quote"

// Server Actions de orçamentos. Podem ser chamadas direto por POST, então cada
// uma revalida a entrada aqui com o mesmo schema do formulário; os totais são
// calculados na camada de dados (nunca vêm do navegador).
// Retorno: { ok: true, id, quoteNumber } ou { ok: false, message, fieldErrors? }.

/** Data/hora ISO vinda do navegador (o updated_at lido ao abrir a edição). */
function isTimestamp(value) {
  return typeof value === "string" && value.length <= 40 && !Number.isNaN(Date.parse(value))
}

export async function createQuoteAction(values) {
  // "Hoje" do servidor (fuso de São Paulo): a mesma regra de validade da tela.
  const { data, failure } = parseInput(createQuoteSchema({ today: todayIso() }), values)
  if (failure) return failure
  try {
    const { id, quote_number } = await insertQuote(data)
    revalidatePath("/quotes")
    return { ok: true, id, quoteNumber: quote_number }
  } catch (error) {
    return toFailure("quotes", error)
  }
}

/**
 * Salva a edição de um rascunho. `expectedUpdatedAt`: o updated_at lido ao
 * abrir a edição (o banco recusa se o orçamento mudou depois disso).
 */
export async function updateQuoteAction(id, expectedUpdatedAt, values) {
  if (!isTimestamp(expectedUpdatedAt)) {
    return { ok: false, message: "Recarregue a página e tente de novo." }
  }
  const { data, failure } = parseInput(createQuoteSchema({ today: todayIso() }), values)
  if (failure) return failure
  try {
    const { quote_number } = await updateQuote(id, expectedUpdatedAt, data)
    revalidatePath("/quotes")
    revalidatePath(`/quotes/${id}`)
    return { ok: true, id, quoteNumber: quote_number }
  } catch (error) {
    return toFailure("quotes", error)
  }
}

/** Envia o rascunho (status → sent). O documento fica travado a partir daqui. */
export async function sendQuoteAction(id) {
  try {
    await sendQuote(id)
    revalidatePath("/quotes")
    revalidatePath(`/quotes/${id}`)
    return { ok: true }
  } catch (error) {
    return toFailure("quotes", error)
  }
}

/** Cancela o orçamento (rascunho, enviado ou visualizado). */
export async function cancelQuoteAction(id) {
  try {
    await cancelQuote(id)
    revalidatePath("/quotes")
    revalidatePath(`/quotes/${id}`)
    return { ok: true }
  } catch (error) {
    return toFailure("quotes", error)
  }
}

/** Exclui um rascunho. */
export async function deleteQuoteAction(id) {
  try {
    await deleteQuote(id)
    revalidatePath("/quotes")
    return { ok: true }
  } catch (error) {
    return toFailure("quotes", error)
  }
}

/** Duplica o orçamento como um rascunho novo (para corrigir ou reaproveitar). */
export async function duplicateQuoteAction(id) {
  try {
    const { id: newId, quote_number } = await duplicateQuote(id)
    revalidatePath("/quotes")
    return { ok: true, id: newId, quoteNumber: quote_number }
  } catch (error) {
    return toFailure("quotes", error)
  }
}
