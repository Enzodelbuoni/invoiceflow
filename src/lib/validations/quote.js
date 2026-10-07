import { addDaysIso } from "@/lib/dates"

// Orçamento: limites e valores iniciais do formulário. O schema Zod chega no
// Sprint 7 e a migração (tabela quotes) no Sprint 10; os dois devem repetir
// QUOTE_LIMITS, como clients/services repetem os CHECKs das suas migrações.

export const QUOTE_LIMITS = Object.freeze({
  titleMin: 2,
  titleMax: 120,
  description: 2000,
  notes: 2000,
  terms: 4000,
})

/** Atalhos de validade, em dias a partir de hoje. */
export const VALIDITY_PRESETS = Object.freeze([7, 15, 30])

export const DEFAULT_VALIDITY_DAYS = 15

/**
 * Valores iniciais de um orçamento novo. `today` ("AAAA-MM-DD", fuso de São
 * Paulo) vem do servidor, para servidor e navegador concordarem na data.
 */
export function createEmptyQuoteForm({ today }) {
  return {
    client_id: "",
    title: "",
    description: "",
    valid_until: addDaysIso(today, DEFAULT_VALIDITY_DAYS),
    notes: "",
    terms: "",
  }
}
