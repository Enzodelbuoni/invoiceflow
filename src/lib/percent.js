import { editCurrencyInput, pasteIntoCurrencyInput } from "@/lib/currency-input"
import { parseCurrencyInput } from "@/lib/money"

// Percentuais (desconto e imposto do orçamento): até 2 casas decimais
// ("12,5%", "2,75%"), entre 0 e 100%. Como dinheiro e quantidade, viram
// INTEIRO: centésimos de ponto percentual, os "pontos-base" (12,5% = 1250).
// O campo segue as regras do campo de valor (vírgula decimal, "." vira ","),
// e também recusa o que passaria de 100%, sem cortar o número.

/** 100% em pontos-base. */
export const MAX_PERCENT_BASIS_POINTS = 10_000

/** Dígitos antes da vírgula ("100"). */
export const MAX_PERCENT_INTEGER_DIGITS = 3

/**
 * Texto do campo → pontos-base, ou null se não for um percentual válido:
 * "10" → 1000, "12,5" → 1250, "2.75" → 275, "10%" → 1000. Não aplica o teto
 * (quem chama decide); o campo já não deixa digitar mais de 100%.
 */
export function parsePercentInput(text) {
  if (typeof text !== "string") return null
  return parseCurrencyInput(text.replace(/%/g, ""))
}

/**
 * Pontos-base → texto, sem zeros desnecessários: 1250 → "12,5", 1000 → "10",
 * 275 → "2,75", 5 → "0,05". Para exibir com o símbolo, ver formatPercentValue.
 */
export function formatPercentInput(basisPoints) {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new TypeError(`Percentual inválido: esperava pontos-base inteiros e recebeu ${String(basisPoints)}.`)
  }
  const digits = String(basisPoints).padStart(3, "0")
  const fraction = digits.slice(-2).replace(/0+$/, "")
  return fraction ? `${digits.slice(0, -2)},${fraction}` : digits.slice(0, -2)
}

/** Pontos-base → "12,5%" (para resumo e documento). */
export function formatPercentValue(basisPoints) {
  return `${formatPercentInput(basisPoints)}%`
}

/** Edição do campo: regras do campo de valor + teto de 100%. */
export function editPercentInput(edit) {
  const next = editCurrencyInput({ ...edit, maxIntegerDigits: MAX_PERCENT_INTEGER_DIGITS })
  if (next.rejected) return next
  const basisPoints = parsePercentInput(next.value)
  if (basisPoints !== null && basisPoints > MAX_PERCENT_BASIS_POINTS) {
    // Mesmo tratamento das outras recusas: volta ao valor e ao cursor de antes.
    const before = edit.caret - (edit.value.length - edit.previous.length)
    return { value: edit.previous, caret: Math.min(Math.max(before, 0), edit.previous.length), rejected: true }
  }
  return next
}

/** Colar substituindo tudo: "12.5%" → "12,5"; acima de 100% é recusado. */
export function pasteIntoPercentInput(paste) {
  const text = paste.text.replace(/%/g, "")
  const result = pasteIntoCurrencyInput({
    ...paste,
    text,
    maxIntegerDigits: MAX_PERCENT_INTEGER_DIGITS,
    format: formatPercentInput,
  })
  if (result && !result.rejected && parsePercentInput(result.value) > MAX_PERCENT_BASIS_POINTS) {
    return { rejected: true }
  }
  return result
}

/** Ao sair do campo: "12,50" → "12,5", "10," → "10". Inválido ou vazio fica como está. */
export function normalizePercentInput(text) {
  const basisPoints = parsePercentInput(text)
  return basisPoints === null ? text : formatPercentInput(basisPoints)
}
