import { describe, expect, it } from "vitest"

import {
  MAX_PERCENT_BASIS_POINTS,
  editPercentInput,
  formatPercentInput,
  formatPercentValue,
  normalizePercentInput,
  parsePercentInput,
  pasteIntoPercentInput,
} from "./percent"

describe("parsePercentInput", () => {
  it.each([
    ["10", 1000],
    ["12,5", 1250],
    ["2,75", 275],
    ["2.75", 275],
    ["0,05", 5],
    ["100", 10000],
    ["10%", 1000],
    [" 12,5 % ", 1250],
    ["0", 0],
  ])("%j → %i pontos-base", (text, basisPoints) => {
    expect(parsePercentInput(text)).toBe(basisPoints)
  })

  it.each(["", "%", "abc", "1,555", "-5", null, undefined])("%j → null", (text) => {
    expect(parsePercentInput(text)).toBeNull()
  })
})

describe("formatPercentInput / formatPercentValue", () => {
  it.each([
    [1000, "10"],
    [1250, "12,5"],
    [275, "2,75"],
    [5, "0,05"],
    [0, "0"],
    [MAX_PERCENT_BASIS_POINTS, "100"],
  ])("%i → %s", (basisPoints, text) => {
    expect(formatPercentInput(basisPoints)).toBe(text)
    expect(formatPercentValue(basisPoints)).toBe(`${text}%`)
  })

  it.each([12.5, -1, Number.NaN, "10"])("recusa %j", (value) => {
    expect(() => formatPercentInput(value)).toThrow(TypeError)
  })

  it("ida e volta", () => {
    for (const basisPoints of [1, 10, 99, 100, 101, 1250, 9999, 10000]) {
      expect(parsePercentInput(formatPercentInput(basisPoints))).toBe(basisPoints)
    }
  })
})

describe("campo de percentual", () => {
  const type = (previous, data, caret = previous.length) =>
    editPercentInput({
      previous,
      value: previous.slice(0, caret) + data + previous.slice(caret),
      caret: caret + data.length,
      inputType: "insertText",
      data,
    })

  it("aceita até 100% com até 2 casas", () => {
    expect(type("1", "0")).toEqual({ value: "10", caret: 2, rejected: false })
    expect(type("12", ".")).toMatchObject({ value: "12,", rejected: false })
    expect(type("12,", "5")).toMatchObject({ value: "12,5", rejected: false })
    expect(type("10", "0")).toMatchObject({ value: "100", rejected: false })
    expect(type("100", ",")).toMatchObject({ value: "100,", rejected: false })
  })

  it("recusa o que passaria de 100%, mantendo valor e cursor", () => {
    expect(type("100", "0")).toEqual({ value: "100", caret: 3, rejected: true })
    expect(type("100,", "5")).toEqual({ value: "100,", caret: 4, rejected: true })
    expect(type("15", "0")).toEqual({ value: "15", caret: 2, rejected: true }) // 150%
    expect(type("50", "1", 0)).toEqual({ value: "50", caret: 0, rejected: true }) // 150% digitando no início
  })

  it("recusa a 3ª casa decimal", () => {
    expect(type("2,75", "5")).toMatchObject({ value: "2,75", rejected: true })
  })

  it("colar substituindo tudo interpreta o número (com ou sem %)", () => {
    const paste = (text) => pasteIntoPercentInput({ value: "5", selectionStart: 0, selectionEnd: 1, text })
    expect(paste("12.5%")).toEqual({ value: "12,5", caret: 4 })
    expect(paste("10,00")).toEqual({ value: "10", caret: 2 })
    expect(paste("100")).toEqual({ value: "100", caret: 3 })
    expect(paste("100,01")).toEqual({ rejected: true })
    expect(paste("150")).toEqual({ rejected: true })
    expect(paste("abc")).toEqual({ rejected: true })
  })

  it("colagem parcial fica com a máscara", () => {
    expect(pasteIntoPercentInput({ value: "12", selectionStart: 1, selectionEnd: 1, text: "5" })).toBeNull()
  })

  it.each([
    ["12,50", "12,5"],
    ["10,", "10"],
    ["05", "5"],
    ["100,00", "100"],
    ["", ""],
    ["abc", "abc"],
  ])("ao sair: %j → %j", (text, normalized) => {
    expect(normalizePercentInput(text)).toBe(normalized)
  })
})
