import { describe, expect, it } from "vitest"

import {
  MAX_QUANTITY_HUNDREDTHS,
  MAX_QUANTITY_INTEGER_DIGITS,
  editQuantityInput,
  formatQuantity,
  normalizeQuantityInput,
  parseQuantityInput,
  pasteIntoQuantityInput,
  quantityToNumber,
} from "./quantity"

describe("constantes", () => {
  it("teto de 999.999,99 cabe em 6 dígitos antes da vírgula", () => {
    expect(MAX_QUANTITY_HUNDREDTHS).toBe(99999999)
    expect(String(Math.trunc(MAX_QUANTITY_HUNDREDTHS / 100)).length).toBe(MAX_QUANTITY_INTEGER_DIGITS)
  })
})

describe("parseQuantityInput", () => {
  it.each([
    ["1", 100],
    ["1,5", 150],
    ["0,25", 25],
    ["1.500", 150000],
    ["1.500,75", 150075],
    ["12.5", 1250],
    ["0", 0],
  ])("%s → %i centésimos", (text, hundredths) => {
    expect(parseQuantityInput(text)).toBe(hundredths)
  })

  it.each(["", "  ", "abc", "1,555", "-1", "1/2", "12,345"])("%j → null", (text) => {
    expect(parseQuantityInput(text)).toBeNull()
  })
})

describe("formatQuantity", () => {
  it.each([
    [100, "1"],
    [150, "1,5"],
    [125, "1,25"],
    [25, "0,25"],
    [5, "0,05"],
    [0, "0"],
    [150000, "1.500"],
    [MAX_QUANTITY_HUNDREDTHS, "999.999,99"],
  ])("%i → %s", (hundredths, text) => {
    expect(formatQuantity(hundredths)).toBe(text)
  })

  it.each([1.5, -100, Number.NaN, "100"])("recusa %j", (value) => {
    expect(() => formatQuantity(value)).toThrow(TypeError)
  })

  it("ida e volta: formatar e ler de novo dá o mesmo número", () => {
    for (const hundredths of [1, 10, 99, 100, 101, 1050, 123456, MAX_QUANTITY_HUNDREDTHS]) {
      expect(parseQuantityInput(formatQuantity(hundredths))).toBe(hundredths)
    }
  })
})

describe("quantityToNumber", () => {
  it("converte para exibição (singular/plural da unidade)", () => {
    expect(quantityToNumber(150)).toBe(1.5)
    expect(quantityToNumber(200)).toBe(2)
  })
})

describe("campo de quantidade", () => {
  const type = (previous, data) =>
    editQuantityInput({
      previous,
      value: previous + data,
      caret: previous.length + data.length,
      inputType: "insertText",
      data,
    })

  it("usa vírgula decimal e ponto de milhar enquanto se digita", () => {
    expect(type("1", ".")).toMatchObject({ value: "1,", rejected: false })
    expect(type("1,", "5")).toMatchObject({ value: "1,5", rejected: false })
    expect(type("150", "0")).toMatchObject({ value: "1.500", rejected: false })
  })

  it("recusa a 3ª casa decimal e o 7º dígito antes da vírgula", () => {
    expect(type("1,25", "5")).toMatchObject({ value: "1,25", rejected: true })
    expect(type("999.999", "9")).toMatchObject({ value: "999.999", rejected: true })
  })

  it("ao colar substituindo tudo, interpreta o número sem completar ,00", () => {
    const paste = (text) => pasteIntoQuantityInput({ value: "1", selectionStart: 0, selectionEnd: 1, text })
    expect(paste("1.5")).toEqual({ value: "1,5", caret: 3 })
    expect(paste("2,50")).toEqual({ value: "2,5", caret: 3 })
    expect(paste("1500")).toEqual({ value: "1.500", caret: 5 })
    expect(paste("abc")).toEqual({ rejected: true })
    expect(paste("1.000.000")).toEqual({ rejected: true })
  })

  it("colagem parcial fica com a máscara", () => {
    expect(pasteIntoQuantityInput({ value: "12", selectionStart: 1, selectionEnd: 1, text: "5" })).toBeNull()
  })

  it.each([
    ["1,50", "1,5"],
    ["1,", "1"],
    ["01", "1"],
    ["1.500,00", "1.500"],
    ["0,", "0"],
    ["", ""],
    ["abc", "abc"],
  ])("ao sair: %j → %j", (text, normalized) => {
    expect(normalizeQuantityInput(text)).toBe(normalized)
  })
})
