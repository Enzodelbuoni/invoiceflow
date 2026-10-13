"use server"

import { revalidatePath } from "next/cache"

import { parseInput, toFailure } from "@/lib/action-result"
import { insertQuote } from "@/lib/data/quotes"
import { todayIso } from "@/lib/dates"
import { createQuoteSchema } from "@/lib/validations/quote"

// Server Actions de orçamentos. Podem ser chamadas direto por POST, então cada
// uma revalida a entrada aqui com o mesmo schema do formulário; os totais são
// calculados na camada de dados (nunca vêm do navegador).
// Retorno: { ok: true, id, quoteNumber } ou { ok: false, message, fieldErrors? }.

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
