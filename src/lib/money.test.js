import { describe, expect, it } from "vitest"

import {
  MAX_PRICE_CENTS,
  MAX_PRICE_INTEGER_DIGITS,
  caretAfterMask,
  formatCurrency,
  formatCurrencyInput,
  isCents,
  maskCurrencyInput,
  parseCurrencyInput,
} from "./money"

// O Intl separa "R$" do número com espaço não separável (U+00A0).
const brl = (text) => text.replace(" ", " ")

// Gerador pseudoaleatório determinístico (os testes dão sempre o mesmo resultado).
function* pseudoRandomCents(count, max) {
  let seed = 20261007
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    yield Math.floor((seed / 2147483648) * max)
  }
}

describe("constantes", () => {
  it("teto do preço é R$ 99.999.999,99 (igual ao CHECK do banco) e cabe em 8 dígitos de reais", () => {
    expect(MAX_PRICE_CENTS).toBe(9999999999)
    expect(MAX_PRICE_INTEGER_DIGITS).toBe(8)
  })
})

describe("isCents", () => {
  it.each([0, 1, -1, 123456, Number.MAX_SAFE_INTEGER])("aceita %s", (value) => {
    expect(isCents(value)).toBe(true)
  })

  it.each([10.5, NaN, Infinity, "100", null, undefined, 2 ** 53, 10n])("recusa %s", (value) => {
    expect(isCents(value)).toBe(false)
  })
})

describe("formatCurrency", () => {
  it.each([
    [0, "R$ 0,00"],
    [5, "R$ 0,05"],
    [50, "R$ 0,50"],
    [100, "R$ 1,00"],
    [123456, "R$ 1.234,56"],
    [100000000, "R$ 1.000.000,00"],
    [MAX_PRICE_CENTS, "R$ 99.999.999,99"],
    [-1050, "-R$ 10,50"],
  ])("%s centavos → %s", (cents, expected) => {
    expect(formatCurrency(cents)).toBe(brl(expected))
  })

  it("é exato até o maior inteiro seguro (sem arredondamento de ponto flutuante)", () => {
    // Com format(cents / 100) estes sairiam errados: ",90" e ",88".
    expect(formatCurrency(Number.MAX_SAFE_INTEGER)).toBe(brl("R$ 90.071.992.547.409,91"))
    expect(formatCurrency(9007199254740987)).toBe(brl("R$ 90.071.992.547.409,87"))
  })

  it.each([10.5, NaN, "100", null, undefined, 2 ** 53])("lança TypeError para %s", (value) => {
    expect(() => formatCurrency(value)).toThrow(TypeError)
  })
})

describe("formatCurrencyInput", () => {
  it.each([
    [0, "0,00"],
    [7, "0,07"],
    [99, "0,99"],
    [150000, "1.500,00"],
    [123456789, "1.234.567,89"],
    [MAX_PRICE_CENTS, "99.999.999,99"],
  ])("%s centavos → %s", (cents, expected) => {
    expect(formatCurrencyInput(cents)).toBe(expected)
  })

  it("recusa negativos e não inteiros", () => {
    expect(() => formatCurrencyInput(-1)).toThrow(RangeError)
    expect(() => formatCurrencyInput(1.5)).toThrow(TypeError)
  })
})

describe("parseCurrencyInput", () => {
  it.each([
    // formato brasileiro
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["1.500", 150000],
    ["1.500.000", 150000000],
    ["1.500,5", 150050],
    ["12,5", 1250],
    ["12,", 1200],
    [",5", 50],
    ["0,05", 5],
    ["0", 0],
    ["1500", 150000],
    ["007", 700],
    ["99.999.999,99", MAX_PRICE_CENTS],
    // com "R$" e espaços (inclusive o espaço não separável do Intl)
    ["R$ 1.234,56", 123456],
    ["R$1.234,56", 123456],
    ["  r$ 10,00  ", 1000],
    ["R$ 1.234,56", 123456],
    ["1 234,56", 123456],
    // formato americano (comum ao colar de outro lugar)
    ["1,234.56", 123456],
    ["12.50", 1250],
    ["12.5", 1250],
    ["1,234,567", 123456700],
    ["1,234,567.89", 123456789],
    // limite de precisão: 13 dígitos de reais
    ["9999999999999,99", 999999999999999],
  ])("%j → %s centavos", (text, expected) => {
    expect(parseCurrencyInput(text)).toBe(expected)
  })

  it.each([
    "",
    "   ",
    "R$",
    ",",
    ".",
    "abc",
    "12a",
    "-10",
    "+10",
    "1e3",
    "12,345", // ambíguo: 12,345 (3 casas) ou 12.345? Recusa em vez de adivinhar.
    "1,2,3",
    "1.234,567", // 3 casas decimais
    "12.345,6.7",
    "1.50.000",
    "1.2,3.45",
    "12.34.56",
    "1.500.",
    "1,500,",
    "10000000000000", // 14 dígitos de reais: fora da faixa exata
  ])("%j → null", (text) => {
    expect(parseCurrencyInput(text)).toBeNull()
  })

  it.each([null, undefined, 1500, {}])("não-texto (%s) → null", (value) => {
    expect(parseCurrencyInput(value)).toBeNull()
  })

  it("lê de volta exatamente o que formatCurrency e formatCurrencyInput escrevem", () => {
    const samples = [0, 1, 99, 100, 101, 999999, ...pseudoRandomCents(5000, MAX_PRICE_CENTS + 1)]
    for (const cents of samples) {
      expect(parseCurrencyInput(formatCurrency(cents))).toBe(cents)
      expect(parseCurrencyInput(formatCurrencyInput(cents))).toBe(cents)
    }
  })
})

describe("maskCurrencyInput", () => {
  // Simula a pessoa digitando caractere por caractere no fim do campo.
  function typeSequence(keys) {
    const steps = []
    let value = ""
    for (const key of keys) {
      const next = maskCurrencyInput(value + key)
      if (next !== null) value = next
      steps.push(value)
    }
    return steps
  }

  it("agrupa milhares enquanto digita", () => {
    expect(typeSequence("150000")).toEqual(["1", "15", "150", "1.500", "15.000", "150.000"])
  })

  it("digita centavos depois da vírgula", () => {
    expect(typeSequence("1500,50")).toEqual(["1", "15", "150", "1.500", "1.500,", "1.500,5", "1.500,50"])
  })

  it("vírgula no campo vazio vira '0,'", () => {
    expect(typeSequence(",5")).toEqual(["0,", "0,5"])
  })

  it("remove zeros à esquerda", () => {
    expect(typeSequence("005")).toEqual(["0", "0", "5"])
    expect(maskCurrencyInput("0001.500")).toBe("1.500")
  })

  it("recusa a 3ª casa decimal em vez de cortar (o campo mantém o valor anterior)", () => {
    expect(maskCurrencyInput("12,345")).toBeNull()
    expect(typeSequence("12,345")).toEqual(["1", "12", "12,", "12,3", "12,34", "12,34"])
  })

  it("recusa reais acima do teto em vez de cortar", () => {
    expect(maskCurrencyInput("99.999.999")).toBe("99.999.999")
    expect(maskCurrencyInput("199.999.999")).toBeNull()
    expect(maskCurrencyInput("1234", { maxIntegerDigits: 3 })).toBeNull()
  })

  it("ignora uma segunda vírgula", () => {
    expect(maskCurrencyInput("1,5,")).toBe("1,5")
  })

  it("descarta tudo que não for dígito ou vírgula", () => {
    expect(maskCurrencyInput("R$ 1.234,56")).toBe("1.234,56")
    expect(maskCurrencyInput("abc")).toBe("")
    expect(maskCurrencyInput("")).toBe("")
    expect(maskCurrencyInput(null)).toBe("")
  })

  it("é idempotente e o texto mascarado sempre é lido pelo parser como o mesmo valor", () => {
    for (const cents of pseudoRandomCents(2000, MAX_PRICE_CENTS + 1)) {
      const text = formatCurrencyInput(cents)
      expect(maskCurrencyInput(text)).toBe(text)
      expect(parseCurrencyInput(maskCurrencyInput(text))).toBe(cents)
    }
    for (const partial of ["1", "1.500", "1.500,", "1.500,5", "0,", "0,0"]) {
      expect(maskCurrencyInput(partial)).toBe(partial)
      expect(parseCurrencyInput(partial)).not.toBeNull()
    }
  })
})

describe("caretAfterMask", () => {
  it("digitando no fim, o cursor fica no fim", () => {
    // "150" + "0" → "1.500"
    expect(caretAfterMask("1500", 4, "1.500")).toBe(5)
  })

  it("vírgula no campo vazio: cursor depois de '0,' (o próximo dígito entra nos centavos)", () => {
    expect(caretAfterMask(",", 1, "0,")).toBe(2)
  })

  it("apagando no meio, o cursor fica onde estava o dígito apagado", () => {
    // "1.2|34" + Backspace → "1.|34" → "134" com o cursor depois do "1"
    expect(caretAfterMask("1.34", 2, "134")).toBe(1)
  })

  it("digitando no meio, o cursor fica depois do dígito novo", () => {
    // "12|.345" + "9" → "129|.345" → "129.345"
    const position = caretAfterMask("129.345", 3, "129.345")
    expect("129.345".slice(0, position).replace(/\D/g, "")).toBe("129")
  })

  it("zero à esquerda removido não desloca o cursor", () => {
    // "|5" + "0" → "0|5" → "5" com o cursor no início
    expect(caretAfterMask("05", 1, "5")).toBe(0)
  })
})
