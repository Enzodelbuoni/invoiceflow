import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { SERVICE_UNIT_VALUES } from "@/lib/constants/service-units"
import { MAX_PRICE_CENTS } from "@/lib/money"

import { EMPTY_SERVICE_FORM, serviceSchema, toServiceFormValues } from "./service"

const VALID = { name: "Design de logo", description: "", unit: "project", price: "1.500,00" }

/** Primeira mensagem de erro de cada campo (como o formulário e a action mostram). */
function errorsOf(values) {
  const result = serviceSchema.safeParse(values)
  if (result.success) return null
  const errors = {}
  for (const issue of result.error.issues) errors[issue.path[0]] ??= issue.message
  return errors
}

describe("serviceSchema: saída no formato do banco", () => {
  it("normaliza textos e converte o preço para centavos", () => {
    expect(
      serviceSchema.parse({ name: "  Design de logo  ", description: "  Três propostas  ", unit: "project", price: " 1.500,50 " }),
    ).toEqual({ name: "Design de logo", description: "Três propostas", unit: "project", price_cents: 150050 })
  })

  it("descrição vazia vira null", () => {
    expect(serviceSchema.parse({ ...VALID, description: "   " }).description).toBeNull()
  })

  it("descarta campos extras (não dá para injetar user_id ou id pela action)", () => {
    const output = serviceSchema.parse({ ...VALID, user_id: "outro-usuario", id: "x", price_cents: 1 })
    expect(Object.keys(output).sort()).toEqual(["description", "name", "price_cents", "unit"])
    expect(output.price_cents).toBe(150000)
  })

  it.each([
    ["0", 0],
    ["0,01", 1],
    ["150", 15000],
    ["R$ 2.500,00", 250000],
    ["99.999.999,99", MAX_PRICE_CENTS],
  ])("preço %j → %s centavos", (price, cents) => {
    expect(serviceSchema.parse({ ...VALID, price }).price_cents).toBe(cents)
  })
})

describe("serviceSchema: erros por campo", () => {
  it.each([
    ["", "Informe o preço."],
    ["   ", "Informe o preço."],
    [undefined, "Informe o preço."],
    ["abc", "Digite um valor válido, como 1.500,00."],
    ["-10", "Digite um valor válido, como 1.500,00."],
    ["12,345", "Digite um valor válido, como 1.500,00."],
    ["100.000.000,00", "O preço pode ser no máximo R$ 99.999.999,99."],
  ])("preço %j → %j", (price, message) => {
    expect(errorsOf({ ...VALID, price })).toEqual({ price: message })
  })

  it.each([
    ["", "Informe o nome do serviço."],
    ["a", "Informe o nome do serviço."],
    ["😀", "Informe o nome do serviço."], // 1 caractere para o banco, embora "😀".length seja 2
    ["a".repeat(121), "O nome pode ter no máximo 120 caracteres."],
  ])("nome %j → %j", (name, message) => {
    expect(errorsOf({ ...VALID, name })).toEqual({ name: message })
  })

  it("conta caracteres como o banco: 120 emojis cabem no limite de 120", () => {
    expect(errorsOf({ ...VALID, name: "😀".repeat(120) })).toBeNull()
    expect(errorsOf({ ...VALID, name: "😀😀" })).toBeNull()
  })

  it("descrição até 1000 caracteres", () => {
    expect(errorsOf({ ...VALID, description: "a".repeat(1000) })).toBeNull()
    expect(errorsOf({ ...VALID, description: "a".repeat(1001) })).toEqual({
      description: "A descrição pode ter no máximo 1000 caracteres.",
    })
  })

  it.each(["", "hora", "HOUR", undefined])("unidade %j → erro", (unit) => {
    expect(errorsOf({ ...VALID, unit })).toEqual({ unit: "Escolha a unidade de cobrança." })
  })

  it("formulário vazio aponta nome e preço", () => {
    expect(errorsOf(EMPTY_SERVICE_FORM)).toEqual({
      name: "Informe o nome do serviço.",
      price: "Informe o preço.",
    })
  })
})

describe("toServiceFormValues", () => {
  it("sem serviço devolve o formulário vazio (com unidade padrão hora)", () => {
    expect(toServiceFormValues(null)).toEqual({ name: "", description: "", unit: "hour", price: "" })
  })

  it("serviço do banco → formulário → schema devolve os mesmos dados", () => {
    const row = { id: "1", name: "Revisão de texto", description: null, unit: "word", price_cents: 12, created_at: "x" }
    const values = toServiceFormValues(row)
    expect(values).toEqual({ name: "Revisão de texto", description: "", unit: "word", price: "0,12" })
    expect(serviceSchema.parse(values)).toEqual({
      name: "Revisão de texto",
      description: null,
      unit: "word",
      price_cents: 12,
    })
  })
})

describe("sincronia com o banco (migração create_services)", () => {
  const sql = readFileSync(
    new URL("../../../supabase/migrations/20261007163349_create_services.sql", import.meta.url),
    "utf8",
  )

  it("a lista de unidades é a mesma do CHECK de services.unit", () => {
    const list = sql.match(/unit in \(([^)]*)\)/)?.[1]
    const units = [...list.matchAll(/'([^']+)'/g)].map((match) => match[1])
    expect(units).toEqual([...SERVICE_UNIT_VALUES])
  })

  it("o teto de preço é o mesmo do CHECK de services.price_cents", () => {
    const max = sql.match(/price_cents between 0 and (\d+)/)?.[1]
    expect(Number(max)).toBe(MAX_PRICE_CENTS)
  })

  it("os limites de nome e descrição são os mesmos dos CHECKs", () => {
    expect(sql).toMatch(/char_length\(btrim\(name\)\) between 2 and 120/)
    expect(sql).toMatch(/char_length\(description\) <= 1000/)
  })
})
