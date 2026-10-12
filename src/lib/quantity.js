import { editCurrencyInput, pasteIntoCurrencyInput } from "@/lib/currency-input"
import { parseCurrencyInput } from "@/lib/money"

// Quantidade de um item do orçamento: até 2 casas decimais ("1,5 hora",
// "0,25 dia"). Como o dinheiro, é guardada como INTEIRO, em centésimos
// (150 = 1,5), para as contas do motor de cálculos (Sprint 8) serem exatas.
// O campo segue as regras do campo de valor (vírgula decimal, ponto de milhar,
// "." vira ","), só que sem o "R$" e sem completar ",00" ao sair.

/** Dígitos antes da vírgula: até 999.999,99. */
export const MAX_QUANTITY_INTEGER_DIGITS = 6

export const MAX_QUANTITY_HUNDREDTHS = 99_999_999

/** Texto inicial do campo num item novo. */
export const DEFAULT_QUANTITY_INPUT = "1"

/**
 * Texto do campo → centésimos inteiros, ou null se não for uma quantidade
 * válida: "1,5" → 150, "1.500" → 150000, "2" → 200. Aceita os mesmos formatos
 * do campo de valor (ver parseCurrencyInput). Não aplica teto nem mínimo: o
 * schema do orçamento (Sprint 7) decide (quantidade > 0).
 */
export function parseQuantityInput(text) {
  return parseCurrencyInput(text)
}

/** "1234567" → "1.234.567" */
function groupThousands(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/**
 * Centésimos → texto, sem zeros desnecessários: 150 → "1,5", 25 → "0,25",
 * 200 → "2", 150000 → "1.500". Usado no campo e na exibição.
 */
export function formatQuantity(hundredths) {
  if (!Number.isSafeInteger(hundredths) || hundredths < 0) {
    throw new TypeError(`Quantidade inválida: esperava centésimos inteiros e recebeu ${String(hundredths)}.`)
  }
  const digits = String(hundredths).padStart(3, "0")
  const integer = groupThousands(digits.slice(0, -2))
  const fraction = digits.slice(-2).replace(/0+$/, "")
  return fraction ? `${integer},${fraction}` : integer
}

/**
 * Centésimos → número (150 → 1.5). Só para exibição, como escolher entre
 * singular e plural da unidade; contas usam os centésimos.
 */
export function quantityToNumber(hundredths) {
  return hundredths / 100
}

/** Edição do campo (mesmas regras do campo de valor; ver editCurrencyInput). */
export function editQuantityInput(edit) {
  return editCurrencyInput({ ...edit, maxIntegerDigits: MAX_QUANTITY_INTEGER_DIGITS })
}

/** Colar no campo: "1.5" e "1,50" substituindo tudo viram "1,5" (ver pasteIntoCurrencyInput). */
export function pasteIntoQuantityInput(paste) {
  return pasteIntoCurrencyInput({ ...paste, maxIntegerDigits: MAX_QUANTITY_INTEGER_DIGITS, format: formatQuantity })
}

/**
 * Ao sair do campo: "1,50" → "1,5", "1," → "1", "01" → "1". Texto inválido
 * (ou vazio) fica como está, para o schema mostrar o erro.
 */
export function normalizeQuantityInput(text) {
  const hundredths = parseQuantityInput(text)
  return hundredths === null ? text : formatQuantity(hundredths)
}
