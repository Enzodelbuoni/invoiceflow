import { afterEach, describe, expect, it, vi } from "vitest"

import { parseInput, toFailure } from "./action-result"
import { DataError, isUuid, sanitizeSearch } from "./data/shared"
import { serviceSchema } from "./validations/service"

// "server-only" lança erro fora do servidor do Next; aqui ele vira um módulo vazio.
vi.mock("server-only", () => ({}))

afterEach(() => vi.restoreAllMocks())

describe("parseInput (contrato das Server Actions)", () => {
  it("entrada válida → { data } já no formato do banco", () => {
    expect(parseInput(serviceSchema, { name: "Logo", description: "", unit: "project", price: "1.500" })).toEqual({
      data: { name: "Logo", description: null, unit: "project", price_cents: 150000 },
    })
  })

  it("entrada inválida → primeira mensagem de cada campo", () => {
    expect(parseInput(serviceSchema, { name: "", description: "", unit: "x", price: "" })).toEqual({
      failure: {
        ok: false,
        message: "Confira os campos destacados.",
        fieldErrors: {
          name: "Informe o nome do serviço.",
          unit: "Escolha a unidade de cobrança.",
          price: "Informe o preço.",
        },
      },
    })
  })

  it.each([undefined, null, "texto", 42, []])("POST forjado com %j não quebra a action", (values) => {
    const { failure } = parseInput(serviceSchema, values)
    expect(failure).toMatchObject({ ok: false, message: "Confira os campos destacados." })
  })
})

describe("toFailure", () => {
  it("DataError vira a mensagem amigável, sem log", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(toFailure("services", new DataError("not_found", "Serviço não encontrado."))).toEqual({
      ok: false,
      message: "Serviço não encontrado.",
    })
    expect(log).not.toHaveBeenCalled()
  })

  it("erro inesperado vira mensagem genérica e vai para o log do servidor", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(toFailure("services", new Error("detalhe interno"))).toEqual({
      ok: false,
      message: "Algo deu errado. Tente novamente em instantes.",
    })
    expect(log).toHaveBeenCalledOnce()
  })
})

describe("peças da camada de dados", () => {
  it.each([
    ["6f1c2a9e-1b2c-4d3e-8f90-123456789abc", true],
    ["6F1C2A9E-1B2C-4D3E-8F90-123456789ABC", true],
    ["123", false],
    ["6f1c2a9e-1b2c-4d3e-8f90-123456789abc' or 1=1", false],
    [undefined, false],
  ])("isUuid(%j) → %s", (value, expected) => {
    expect(isUuid(value)).toBe(expected)
  })

  it.each([
    ["  logo  ", "logo"],
    ["50%_off", "50  off"],
    ["a,b(c)*d\\e", "a b c  d e"],
    [undefined, ""],
    ["x".repeat(100), "x".repeat(80)],
  ])("sanitizeSearch(%j) → %j", (term, expected) => {
    expect(sanitizeSearch(term)).toBe(expected)
  })
})
