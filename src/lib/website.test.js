import { describe, expect, it } from "vitest"

import { displayWebsite, isValidWebsite, normalizeWebsite, websiteFormValue } from "./website"

describe("normalizeWebsite", () => {
  it.each([
    ["", ""],
    ["   ", ""],
    [undefined, ""],
    ["meusite.com.br", "https://meusite.com.br"],
    ["  instagram.com/ana.design  ", "https://instagram.com/ana.design"],
    ["http://antigo.com", "http://antigo.com"],
    ["HTTPS://Site.com", "HTTPS://Site.com"],
  ])("%j → %j", (value, expected) => {
    expect(normalizeWebsite(value)).toBe(expected)
  })
})

describe("isValidWebsite", () => {
  it.each([
    ["https://meusite.com.br", true],
    ["https://www.instagram.com/ana.design?hl=pt", true],
    ["http://antigo.com:8080/portfolio", true],
    ["https://ação.com.br", true],
    ["https://localhost", false],
    ["https://meusite.", false],
    ["https://.com", false],
    ["https://meu site.com", false],
    ["javascript:alert(1)", false],
    ["ftp://arquivos.com", false],
    ["https://banco.com@golpe.com", false],
    ["https://", false],
  ])("%j → %s", (url, expected) => {
    expect(isValidWebsite(url)).toBe(expected)
  })

  it("todo endereço aceito também passa no CHECK do banco", () => {
    const check = /^https?:\/\/[^\s/]+\.[^\s]+$/i
    for (const url of ["https://meusite.com.br", "http://antigo.com:8080/portfolio", "https://a.b"]) {
      expect(isValidWebsite(url)).toBe(true)
      expect(url).toMatch(check)
    }
  })
})

describe("exibição", () => {
  it.each([
    ["https://meusite.com.br/", "meusite.com.br"],
    ["http://antigo.com/portfolio", "antigo.com/portfolio"],
    [null, ""],
  ])("displayWebsite(%j) → %j", (url, expected) => {
    expect(displayWebsite(url)).toBe(expected)
  })

  it("no formulário só o https:// sai (http:// continua à vista)", () => {
    expect(websiteFormValue("https://meusite.com.br")).toBe("meusite.com.br")
    expect(websiteFormValue("http://antigo.com")).toBe("http://antigo.com")
    expect(websiteFormValue(null)).toBe("")
  })
})
