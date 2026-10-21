import { afterEach, describe, expect, it, vi } from "vitest"

import { parseInput, toFailure } from "./action-result"
import { DataError, databaseError, isUuid, sanitizeSearch } from "./data/shared"
import { createEmptyQuoteForm, createQuoteSchema } from "./validations/quote"
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

  it("campos aninhados viram caminhos do React Hook Form (items.0.name)", () => {
    const schema = createQuoteSchema({ today: "2026-10-12" })
    const values = {
      ...createEmptyQuoteForm({ today: "2026-10-12" }),
      title: "Site",
      items: [{ service_id: "", name: "", description: "", quantity: "0", unit: "unit", unit_price: "10" }],
    }
    expect(parseInput(schema, values).failure.fieldErrors).toEqual({
      client_id: "Escolha quem vai receber a proposta.",
      "items.0.name": "Informe o nome do item.",
      "items.0.quantity": "A quantidade precisa ser maior que zero.",
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
      code: "not_found",
    })
    expect(log).not.toHaveBeenCalled()
  })

  it("DataError com campo também vira o erro desse campo", () => {
    const error = new DataError("client_missing", "Este cliente não existe mais.", { field: "client_id" })
    expect(toFailure("quotes", error)).toEqual({
      ok: false,
      message: "Este cliente não existe mais.",
      code: "client_missing",
      fieldErrors: { client_id: "Este cliente não existe mais." },
    })
  })

  it("sessão expirada (getDataContext sem usuário) leva o código para o navegador", () => {
    expect(toFailure("clients", new DataError("unauthenticated", "Sua sessão expirou. Entre novamente."))).toEqual({
      ok: false,
      message: "Sua sessão expirou. Entre novamente.",
      code: "unauthenticated",
    })
  })

  it("erro inesperado vira mensagem genérica e vai para o log do servidor", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(toFailure("services", new Error("detalhe interno"))).toEqual({
      ok: false,
      message: "Algo deu errado. Tente novamente em instantes.",
    })
    expect(log).toHaveBeenCalledOnce()
  })

  it("o log do erro inesperado não leva os dados da linha nem e-mails", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: "Key (email)=(ana@empresa.com) already exists.",
    }
    toFailure("clients", error)
    expect(log).toHaveBeenCalledWith("[clients] erro inesperado:", {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    })
  })

  it("databaseError registra só código e mensagem (sem details) e devolve o DataError", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = databaseError("clients.create", "save_failed", "Não foi possível salvar.", {
      code: "23514",
      message: "violates check constraint",
      details: "Failing row contains (ana@empresa.com).",
    })
    expect(error).toBeInstanceOf(DataError)
    expect(error).toMatchObject({ code: "save_failed", message: "Não foi possível salvar." })
    expect(log).toHaveBeenCalledWith("[data:clients.create] save_failed:", { code: "23514", message: "violates check constraint" })
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
