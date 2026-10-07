import { describe, expect, it } from "vitest"

import { editCurrencyInput, normalizeCurrencyInput, pasteIntoCurrencyInput } from "./currency-input"

// Notação dos testes: "|" marca o cursor e "[...]" marca uma seleção.
// Ex.: "1.5|00,00" é o valor "1.500,00" com o cursor depois do "5".
function parse(notation) {
  const open = notation.indexOf("[")
  if (open !== -1) {
    const close = notation.indexOf("]")
    const value = notation.slice(0, open) + notation.slice(open + 1, close) + notation.slice(close + 1)
    return { value, start: open, end: close - 1 }
  }
  const caret = notation.indexOf("|")
  return { value: notation.replace("|", ""), start: caret, end: caret }
}

const show = ({ value, caret }) => `${value.slice(0, caret)}|${value.slice(caret)}`

/** Faz o que o navegador faria (sem máscara) e passa o resultado pelo campo. */
function edit(notation, inputType, data = null, options) {
  const { value: previous, start, end } = parse(notation)
  let value = previous
  let caret = start
  if (inputType === "insertText" || inputType === "insertFromPaste") {
    value = previous.slice(0, start) + data + previous.slice(end)
    caret = start + data.length
  } else if (start !== end) {
    value = previous.slice(0, start) + previous.slice(end)
  } else if (inputType === "deleteContentBackward") {
    if (start === 0) return notation
    value = previous.slice(0, start - 1) + previous.slice(start)
    caret = start - 1
  } else if (inputType === "deleteContentForward") {
    value = previous.slice(0, start) + previous.slice(start + 1)
  }
  const result = editCurrencyInput({ previous, value, caret, inputType, data, ...options })
  return { text: show(result), rejected: result.rejected }
}

const type = (notation, char) => edit(notation, "insertText", char).text
const backspace = (notation) => edit(notation, "deleteContentBackward").text
const del = (notation) => edit(notation, "deleteContentForward").text

describe("editCurrencyInput — digitação", () => {
  it.each([
    ["|", "1", "1|"],
    ["1|", "5", "15|"],
    ["150|", "0", "1.500|"],
    ["1.500|", "0", "15.000|"],
    ["1.500|", ",", "1.500,|"],
    ["1.500,|", "5", "1.500,5|"],
    ["1.500,5|", "0", "1.500,50|"],
    ["|", ",", "0,|"],
    ["0|", "5", "5|"],
    ["1.5|00,00", "0", "15.0|00,00"],
    ["|1.500,00", "9", "9|1.500,00"],
  ])("%s + %s → %s", (before, char, after) => {
    expect(type(before, char)).toBe(after)
  })

  it('"." digitado vira vírgula decimal', () => {
    expect(type("1500|", ".")).toBe("1.500,|")
    expect(type("12|", ".")).toBe("12,|")
    expect(type("|", ".")).toBe("0,|")
  })

  it('"." digitado onde já existe vírgula não muda o número', () => {
    expect(edit("1,5|", "insertText", ".")).toEqual({ text: "1,5|", rejected: false })
  })

  it("letras e símbolos são ignorados", () => {
    expect(type("15|", "a")).toBe("15|")
    expect(type("15|", "-")).toBe("15|")
  })

  it("recusa a 3ª casa decimal e mantém valor e cursor", () => {
    expect(edit("1.500,00|", "insertText", "1")).toEqual({ text: "1.500,00|", rejected: true })
    expect(edit("1.500,0|0", "insertText", "1")).toEqual({ text: "1.500,0|0", rejected: true })
  })

  it("recusa uma segunda vírgula que deixaria 3 casas decimais", () => {
    expect(edit("|1,50", "insertText", ",")).toEqual({ text: "|1,50", rejected: true })
  })

  it("recusa reais acima do teto (8 dígitos) sem cortar o número", () => {
    expect(edit("99.999.999|", "insertText", "9")).toEqual({ text: "99.999.999|", rejected: true })
    expect(edit("|99.999.999,99", "insertText", "1")).toEqual({ text: "|99.999.999,99", rejected: true })
    expect(type("9.999.999|", "9")).toBe("99.999.999|")
  })

  it("respeita maxIntegerDigits", () => {
    expect(edit("999|", "insertText", "9", { maxIntegerDigits: 3 }).rejected).toBe(true)
  })

  it("substituir uma seleção funciona como digitar", () => {
    expect(type("[1.500,00]", "7")).toBe("7|")
    expect(type("1.[500],00", "9")).toBe("19|,00")
  })
})

describe("editCurrencyInput — apagar", () => {
  it.each([
    ["15|", "1|"],
    ["1.500|", "150|"],
    ["1.500,5|", "1.500,|"],
    ["1.500,|", "1.500|"],
    ["1|", "|"],
    ["15.000|", "1.500|"],
  ])("Backspace em %s → %s", (before, after) => {
    expect(backspace(before)).toBe(after)
  })

  it("Backspace logo depois de um ponto de milhar apaga o dígito anterior", () => {
    expect(backspace("1.|500,00")).toBe("|500,00")
    expect(backspace("12.|345")).toBe("1.|345")
    expect(backspace("1.234.|567")).toBe("123.|567")
  })

  it("Delete logo antes de um ponto de milhar apaga o dígito seguinte", () => {
    expect(del("1|.500,00")).toBe("1|00,00")
    expect(del("12|.345")).toBe("1.2|45")
  })

  it("apagar a vírgula junta as casas decimais aos reais", () => {
    expect(backspace("1,|50")).toBe("1|50")
  })

  it("apagar uma seleção que cobre o ponto funciona normalmente", () => {
    expect(backspace("1[.500],00")).toBe("1|,00")
    expect(backspace("[1.500,00]")).toBe("|")
  })
})

describe("pasteIntoCurrencyInput", () => {
  const paste = (notation, text, options) => {
    const { value, start, end } = parse(notation)
    return pasteIntoCurrencyInput({ value, selectionStart: start, selectionEnd: end, text, ...options })
  }

  it.each([
    ["R$ 1.500,00", "1.500,00"],
    ["1,500.00", "1.500,00"],
    ["12.50", "12,50"],
    ["1500", "1.500,00"],
    ["  99.999.999,99 ", "99.999.999,99"],
    ["0", "0,00"],
  ])("campo vazio: colar %j → %s", (text, value) => {
    expect(paste("|", text)).toEqual({ value, caret: value.length })
  })

  it("com tudo selecionado substitui o valor", () => {
    expect(paste("[1.500,00]", "R$ 2.000")).toEqual({ value: "2.000,00", caret: 8 })
  })

  it.each(["abc", "12,345", "R$", "-50", "1.2.3", "100.000.000,00", "1,999"])("recusa %j", (text) => {
    expect(paste("|", text)).toEqual({ rejected: true })
  })

  it("respeita maxIntegerDigits", () => {
    expect(paste("|", "1.000", { maxIntegerDigits: 3 })).toEqual({ rejected: true })
    expect(paste("|", "999,99", { maxIntegerDigits: 3 })).toEqual({ value: "999,99", caret: 6 })
  })

  it("colagem parcial fica com o navegador + máscara", () => {
    expect(paste("1.5|00", "9")).toBeNull()
    expect(paste("1.[50]0", "9")).toBeNull()
  })

  it("colagem parcial passa pela máscara do onChange", () => {
    expect(edit("1|", "insertFromPaste", "500").text).toBe("1.500|")
  })
})

describe("normalizeCurrencyInput", () => {
  it.each([
    ["1500", "1.500,00"],
    ["1.500", "1.500,00"],
    ["12,5", "12,50"],
    ["0,", "0,00"],
    [",5", "0,50"],
    ["1.500,00", "1.500,00"],
  ])("%j → %j", (text, expected) => {
    expect(normalizeCurrencyInput(text)).toBe(expected)
  })

  it.each(["", "abc", "12,345"])("deixa %j como está (o schema mostra o erro)", (text) => {
    expect(normalizeCurrencyInput(text)).toBe(text)
  })
})
