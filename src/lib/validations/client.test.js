import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { clientSchema, EMPTY_CLIENT_FORM } from "./client"

// Cobre as correções de 2026-10-07: os limites agora são contados como o banco
// conta, e o e-mail respeita o CHECK de 254 caracteres.

const VALID = { ...EMPTY_CLIENT_FORM, name: "Aurora Estúdio" }

function errorsOf(values) {
  const result = clientSchema.safeParse(values)
  if (result.success) return null
  const errors = {}
  for (const issue of result.error.issues) errors[issue.path[0]] ??= issue.message
  return errors
}

describe("clientSchema", () => {
  it("cliente mínimo válido vira o formato do banco", () => {
    expect(clientSchema.parse(VALID)).toEqual({
      name: "Aurora Estúdio",
      email: null,
      phone: null,
      company: null,
      document: null,
      address: null,
      notes: null,
    })
  })

  it("nome com 1 emoji é recusado (o CHECK do banco conta 1 caractere)", () => {
    expect(errorsOf({ ...VALID, name: "😀" })).toEqual({ name: "Informe o nome do cliente." })
  })

  it("e-mail acima de 254 caracteres é recusado (antes passava e o banco recusava)", () => {
    const domain = `${`${"b".repeat(60)}.`.repeat(3)}com` // 186 caracteres
    const atLimit = `${"a".repeat(67)}@${domain}`
    const overLimit = `${"a".repeat(68)}@${domain}`
    expect([atLimit.length, overLimit.length]).toEqual([254, 255])
    expect(errorsOf({ ...VALID, email: atLimit })).toBeNull()
    expect(errorsOf({ ...VALID, email: overLimit })).toEqual({
      email: "O e-mail pode ter no máximo 254 caracteres.",
    })
  })

  it("e-mail é normalizado (aparado e em minúsculas)", () => {
    expect(clientSchema.parse({ ...VALID, email: "  Contato@Aurora.COM " }).email).toBe("contato@aurora.com")
  })

  it("os limites são os mesmos dos CHECKs da migração create_clients", () => {
    const sql = readFileSync(
      new URL("../../../supabase/migrations/20261006181806_create_clients.sql", import.meta.url),
      "utf8",
    )
    expect(sql).toMatch(/char_length\(btrim\(name\)\) between 2 and 120/)
    expect(sql).toMatch(/char_length\(email\) <= 254/)
  })
})
