import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { approveQuoteSchema, declineQuoteSchema, emptyApproveForm, QUOTE_RESPONSE_LIMITS } from "./quote-response"

const approve = (overrides = {}) => ({
  signer_name: "Bruno Cliente",
  signer_email: "bruno@cliente.com",
  accept_terms: true,
  ...overrides,
})

/** Primeira mensagem de erro de cada campo. */
function errorsOf(schema, values) {
  const result = schema.safeParse(values)
  if (result.success) return {}
  const errors = {}
  for (const issue of result.error.issues) errors[issue.path.join(".")] ??= issue.message
  return errors
}

describe("approveQuoteSchema", () => {
  it("normaliza nome e e-mail", () => {
    expect(approveQuoteSchema.parse(approve({ signer_name: "  Bruno Cliente ", signer_email: " Bruno@Cliente.COM " }))).toEqual({
      signer_name: "Bruno Cliente",
      signer_email: "bruno@cliente.com",
      accept_terms: true,
    })
  })

  it("exige o aceite dos termos", () => {
    expect(errorsOf(approveQuoteSchema, approve({ accept_terms: false }))).toEqual({
      accept_terms: "Para aprovar, confirme que leu e aceita a proposta.",
    })
    expect(errorsOf(approveQuoteSchema, approve({ accept_terms: "true" }))).toHaveProperty("accept_terms")
  })

  it.each([
    ["", "Digite seu nome completo."],
    ["   ", "Digite seu nome completo."],
    ["B", "Digite seu nome completo."],
    ["a".repeat(121), "O nome pode ter no máximo 120 caracteres."],
  ])("nome %j → erro", (name, message) => {
    expect(errorsOf(approveQuoteSchema, approve({ signer_name: name }))).toEqual({ signer_name: message })
  })

  it("conta os caracteres como o Postgres (120 emojis passam)", () => {
    expect(approveQuoteSchema.safeParse(approve({ signer_name: "😀".repeat(120) })).success).toBe(true)
  })

  it.each([
    ["", "Informe seu e-mail."],
    ["bruno", "Digite um e-mail válido, como nome@empresa.com."],
    ["bruno@cliente", "Digite um e-mail válido, como nome@empresa.com."],
    [`${"a".repeat(245)}@cliente.com`, "O e-mail pode ter no máximo 254 caracteres."],
  ])("e-mail %j → erro", (email, message) => {
    expect(errorsOf(approveQuoteSchema, approve({ signer_email: email }))).toEqual({ signer_email: message })
  })

  it("descarta campos que não são do formulário", () => {
    expect(approveQuoteSchema.parse(approve({ ip_address: "1.2.3.4", decision: "declined" }))).not.toHaveProperty("ip_address")
  })
})

describe("declineQuoteSchema", () => {
  it("motivo opcional: vazio vira null, texto é aparado", () => {
    expect(declineQuoteSchema.parse({ reason: "   " })).toEqual({ reason: null })
    expect(declineQuoteSchema.parse({ reason: "  Achei caro. " })).toEqual({ reason: "Achei caro." })
  })

  it("motivo com até 1000 caracteres", () => {
    expect(declineQuoteSchema.safeParse({ reason: "a".repeat(1000) }).success).toBe(true)
    expect(errorsOf(declineQuoteSchema, { reason: "a".repeat(1001) })).toEqual({
      reason: "O motivo pode ter no máximo 1000 caracteres.",
    })
  })
})

describe("emptyApproveForm", () => {
  it("começa com o e-mail do cadastro do cliente (se houver) e sem aceite", () => {
    expect(emptyApproveForm({ email: "bruno@cliente.com" })).toEqual({
      signer_name: "",
      signer_email: "bruno@cliente.com",
      accept_terms: false,
    })
    expect(emptyApproveForm({ email: null }).signer_email).toBe("")
    expect(emptyApproveForm().signer_email).toBe("")
  })
})

// A migração quote_responses repete os limites do app (se um lado mudar sem o
// outro, o formulário aceitaria algo que o banco recusa).
describe("migração quote_responses × limites do app", () => {
  const sql = readFileSync(
    new URL("../../../supabase/migrations/20261014160332_quote_responses.sql", import.meta.url),
    "utf8",
  )

  it("nome, e-mail e motivo", () => {
    const { signerNameMin, signerNameMax, signerEmailMax, reason } = QUOTE_RESPONSE_LIMITS
    expect(sql).toContain(`char_length(btrim(signer_name)) between ${signerNameMin} and ${signerNameMax}`)
    expect(sql).toContain(`char_length(signer_email) <= ${signerEmailMax}`)
    expect(sql).toContain(`char_length(reason) <= ${reason}`)
  })
})
