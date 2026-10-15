// Dinheiro no InvoiceFlow: SEMPRE centavos inteiros (Number.isSafeInteger).
// R$ 1.234,56 é guardado, calculado e trafegado como 123456. Só vira texto na
// borda (exibição e campos de formulário). Assim nenhuma conta passa por
// decimal em ponto flutuante (0.1 + 0.2 !== 0.3).

/** Teto de preço de um serviço; igual ao CHECK de services.price_cents. */
export const MAX_PRICE_CENTS = 9_999_999_999 // R$ 99.999.999,99

/** Dígitos de reais que cabem no teto (8). Limite da máscara do campo de preço. */
export const MAX_PRICE_INTEGER_DIGITS = String(Math.trunc(MAX_PRICE_CENTS / 100)).length

// Com até 13 dígitos de reais, reais × 100 + centavos fica abaixo de
// Number.MAX_SAFE_INTEGER (9.007.199.254.740.991), então a conta é exata.
const MAX_PARSE_INTEGER_DIGITS = 13

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

/** Centavos inteiros e seguros? (rejeita 10.5, NaN, Infinity, strings…) */
export function isCents(value) {
  return Number.isSafeInteger(value)
}

function assertCents(value) {
  if (!isCents(value)) {
    throw new TypeError(`Valor monetário inválido: esperava centavos inteiros e recebeu ${String(value)}.`)
  }
}

/** "1234567" → "1.234.567" */
function groupThousands(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/** 123456 → "1234.56" e -5 → "-0.05", montado como texto (sem dividir por 100). */
function centsToDecimalString(cents) {
  const sign = cents < 0 ? "-" : ""
  const digits = String(Math.abs(cents)).padStart(3, "0")
  return `${sign}${digits.slice(0, -2)}.${digits.slice(-2)}`
}

/**
 * Centavos → moeda para exibição: 123456 → "R$ 1.234,56".
 * O Intl formata o texto decimal exato, então não há arredondamento.
 * Lança TypeError se não receber centavos inteiros (sinal de bug a montante).
 */
export function formatCurrency(cents) {
  assertCents(cents)
  return currencyFormatter.format(centsToDecimalString(cents))
}

/**
 * Centavos → texto do campo de valor, sem "R$": 150000 → "1.500,00".
 * Usado para preencher o formulário de edição e normalizar o campo ao sair dele.
 */
export function formatCurrencyInput(cents) {
  assertCents(cents)
  if (cents < 0) throw new RangeError("Campos de valor não aceitam números negativos.")
  const digits = String(cents).padStart(3, "0")
  return `${groupThousands(digits.slice(0, -2))},${digits.slice(-2)}`
}

const GROUPED = {
  ".": /^\d{1,3}(\.\d{3})+$/,
  ",": /^\d{1,3}(,\d{3})+$/,
}

/**
 * Texto de valor → centavos inteiros, ou null se não for um valor válido.
 *
 * Aceita "R$", espaços e os formatos brasileiro e americano, decidindo o
 * separador decimal sem adivinhar quando há ambiguidade:
 * - com "." e ",": o último que aparece é o decimal ("1.234,56", "1,234.56");
 * - só ".": grupos de 3 são milhar ("1.500" → R$ 1.500,00); senão um único
 *   ponto com até 2 casas é decimal ("12.50" → R$ 12,50);
 * - só ",": uma vírgula com até 2 casas é decimal ("12,5"); várias vírgulas em
 *   grupos de 3 são milhar ("1,234,567"). "12,345" é ambíguo → null;
 * - mais de 2 casas decimais, sinais, letras ou grupos malformados → null.
 *
 * Não aplica teto: cada schema decide o seu limite (ex.: MAX_PRICE_CENTS).
 */
export function parseCurrencyInput(text) {
  if (typeof text !== "string") return null

  const compact = text.replace(/r\$/gi, "").replace(/[\s  ]/g, "")
  if (!/^[\d.,]+$/.test(compact) || !/\d/.test(compact)) return null

  const lastDot = compact.lastIndexOf(".")
  const lastComma = compact.lastIndexOf(",")
  let integerPart = compact
  let fractionPart = ""

  if (lastDot !== -1 && lastComma !== -1) {
    const decimal = lastDot > lastComma ? "." : ","
    const group = decimal === "." ? "," : "."
    const at = compact.lastIndexOf(decimal)
    integerPart = compact.slice(0, at)
    fractionPart = compact.slice(at + 1)
    if (!GROUPED[group].test(integerPart)) return null
    integerPart = integerPart.replaceAll(group, "")
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separator = lastDot !== -1 ? "." : ","
    const occurrences = compact.split(separator).length - 1
    const at = compact.lastIndexOf(separator)

    if (occurrences === 1 && compact.length - at - 1 <= 2) {
      integerPart = compact.slice(0, at)
      fractionPart = compact.slice(at + 1)
    } else if (GROUPED[separator].test(compact) && (separator === "." || occurrences > 1)) {
      integerPart = compact.replaceAll(separator, "")
    } else {
      return null
    }
  }

  if (fractionPart.length > 2 || !/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionPart)) {
    return null
  }

  const integerDigits = integerPart.replace(/^0+/, "")
  if (integerDigits.length > MAX_PARSE_INTEGER_DIGITS) return null

  return Number(integerDigits || "0") * 100 + Number(fractionPart.padEnd(2, "0"))
}

/**
 * Máscara do campo de valor enquanto a pessoa digita: "150000" → "150.000",
 * "1500,5" → "1.500,5", "," → "0,". A vírgula é o separador decimal e os
 * pontos são só de milhar (o campo converte um "." digitado em "," antes).
 *
 * Retorna null quando a mudança deve ser RECUSADA (3ª casa decimal ou reais
 * acima de `maxIntegerDigits`): o campo mantém o valor anterior, em vez de
 * cortar dígitos e mudar o número sem a pessoa perceber.
 */
export function maskCurrencyInput(raw, { maxIntegerDigits = MAX_PRICE_INTEGER_DIGITS } = {}) {
  const clean = String(raw ?? "").replace(/[^\d,]/g, "")
  if (clean === "") return ""

  const comma = clean.indexOf(",")
  const hasComma = comma !== -1
  const fraction = hasComma ? clean.slice(comma + 1).replaceAll(",", "") : ""
  if (fraction.length > 2) return null

  const integer = (hasComma ? clean.slice(0, comma) : clean).replace(/^0+(?=\d)/, "") || "0"
  if (integer.length > maxIntegerDigits) return null

  return hasComma ? `${groupThousands(integer)},${fraction}` : groupThousands(integer)
}

const SIGNIFICANT = /[\d,]/

/**
 * Posição do cursor depois da máscara. Conta os dígitos/vírgula que estavam À
 * DIREITA do cursor e mantém a mesma quantidade à direita no texto mascarado
 * (a máscara mexe na esquerda: zeros iniciais, "0," e pontos de milhar).
 */
export function caretAfterMask(raw, caret, masked) {
  let remaining = 0
  for (let i = caret; i < raw.length; i++) {
    if (SIGNIFICANT.test(raw[i])) remaining++
  }

  let position = masked.length
  while (remaining > 0 && position > 0) {
    position--
    if (SIGNIFICANT.test(masked[position])) remaining--
  }
  return position
}

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/** A partir de R$ 1 milhão os indicadores mostram o valor compacto. */
const COMPACT_FROM_CENTS = 100_000_000

/**
 * Centavos → valor para indicadores: exato até R$ 999.999,99 ("R$ 69.126,75");
 * a partir de R$ 1 milhão, compacto ("R$ 1,2 mi", "R$ 12,3 mi"). Quem mostra o
 * compacto deve oferecer o exato (title/leitor de tela) com formatCurrency.
 */
export function formatCurrencyCompact(cents) {
  assertCents(cents)
  if (Math.abs(cents) < COMPACT_FROM_CENTS) return formatCurrency(cents)
  return compactCurrencyFormatter.format(centsToDecimalString(cents))
}
