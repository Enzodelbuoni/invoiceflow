import {
  MAX_PRICE_INTEGER_DIGITS,
  caretAfterMask,
  formatCurrencyInput,
  maskCurrencyInput,
  parseCurrencyInput,
} from "@/lib/money"

// Comportamento do campo de valor ("1.500,00"), separado do componente para
// poder ser testado sem navegador. O componente (CurrencyInput) só repassa o
// que o evento informa e aplica o resultado no <input>.

/**
 * Próximo estado do campo depois de uma edição (evento `input`).
 *
 * @param {{
 *   previous: string,        valor antes da edição
 *   value: string,           valor que o navegador acabou de produzir
 *   caret: number,           cursor depois da edição
 *   inputType?: string,      InputEvent.inputType ("insertText", "deleteContentBackward"…)
 *   data?: string | null,    InputEvent.data (o caractere digitado)
 *   maxIntegerDigits?: number,
 * }} edit
 * @returns {{ value: string, caret: number, rejected: boolean }}
 *   `rejected`: a edição foi recusada e o campo volta ao valor anterior.
 */
export function editCurrencyInput({
  previous,
  value,
  caret,
  inputType,
  data,
  maxIntegerDigits = MAX_PRICE_INTEGER_DIGITS,
}) {
  let raw = value
  let position = caret

  // A vírgula é o único separador decimal do campo: um "." digitado vira ",".
  if (inputType === "insertText" && data === "." && raw[position - 1] === ".") {
    raw = `${raw.slice(0, position - 1)},${raw.slice(position)}`
  }

  // Apagar só um ponto de milhar não teria efeito (a máscara o recolocaria e o
  // Backspace ficaria "preso"). Nesse caso apaga também o dígito vizinho.
  const removedGroupSeparator =
    raw.length === previous.length - 1 &&
    previous[position] === "." &&
    raw === previous.slice(0, position) + previous.slice(position + 1)
  if (removedGroupSeparator && inputType === "deleteContentBackward" && position > 0) {
    raw = previous.slice(0, position - 1) + previous.slice(position + 1)
    position -= 1
  } else if (removedGroupSeparator && inputType === "deleteContentForward") {
    raw = previous.slice(0, position) + previous.slice(position + 2)
  }

  const masked = maskCurrencyInput(raw, { maxIntegerDigits })
  if (masked === null) {
    // Volta o cursor para onde estava antes da edição recusada.
    const before = caret - (value.length - previous.length)
    return { value: previous, caret: Math.min(Math.max(before, 0), previous.length), rejected: true }
  }
  return { value: masked, caret: caretAfterMask(raw, position, masked), rejected: false }
}

/**
 * Colar no campo. Quando o texto colado substitui o valor inteiro (campo vazio
 * ou tudo selecionado), interpreta o valor como um todo: "R$ 1.500,00",
 * "1,500.00" e "12.50" viram o número certo, o que a máscara sozinha (que só
 * aceita o formato brasileiro) erraria.
 *
 * @returns {{ value: string, caret: number } | { rejected: true } | null}
 *   `null`: colagem parcial; o navegador cola e a máscara do onChange trata.
 *   `rejected`: texto que não é um valor válido (ou acima do teto); nada muda.
 */
export function pasteIntoCurrencyInput({
  value,
  selectionStart,
  selectionEnd,
  text,
  maxIntegerDigits = MAX_PRICE_INTEGER_DIGITS,
}) {
  const replacesAll = selectionStart === 0 && selectionEnd === value.length
  if (!replacesAll) return null

  const cents = parseCurrencyInput(text)
  if (cents === null || String(Math.trunc(cents / 100)).length > maxIntegerDigits) {
    return { rejected: true }
  }
  const formatted = formatCurrencyInput(cents)
  return { value: formatted, caret: formatted.length }
}

/**
 * Ao sair do campo, completa o valor: "1500" → "1.500,00", "12,5" → "12,50",
 * "0," → "0,00". Texto que não é um valor (ou vazio) fica como está, para o
 * schema mostrar o erro.
 */
export function normalizeCurrencyInput(text) {
  const cents = parseCurrencyInput(text)
  return cents === null ? text : formatCurrencyInput(cents)
}
