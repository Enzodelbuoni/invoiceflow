import { describe, expect, it } from "vitest"

import { matchesSearch, normalizeSearchText } from "./search"

describe("normalizeSearchText", () => {
  it.each([
    ["Estúdio Aurora", "estudio aurora"],
    ["  JOÃO   da  Silva ", "joao da silva"],
    ["Ação & Cia.", "acao & cia."],
    [null, ""],
    [undefined, ""],
  ])("%j → %j", (text, expected) => {
    expect(normalizeSearchText(text)).toBe(expected)
  })
})

describe("matchesSearch", () => {
  const client = "Estúdio Aurora Aurora Design Ltda contato@aurora.com"

  it.each(["estudio", "ESTÚDIO", "aurora est", "design ltda", "contato@", "  aurora  "])("casa %j", (query) => {
    expect(matchesSearch(client, query)).toBe(true)
  })

  it.each(["zzz", "aurora zzz", "estudios"])("não casa %j", (query) => {
    expect(matchesSearch(client, query)).toBe(false)
  })

  it("busca vazia casa tudo", () => {
    expect(matchesSearch(client, "")).toBe(true)
    expect(matchesSearch("", "   ")).toBe(true)
  })
})
