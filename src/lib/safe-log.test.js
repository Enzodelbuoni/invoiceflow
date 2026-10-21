import { afterEach, describe, expect, it, vi } from "vitest"

import { describeError, logError, redact } from "./safe-log"

afterEach(() => vi.restoreAllMocks())

const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJh"

describe("redact", () => {
  it.each([
    ["Usuário ana.souza+orc@empresa.com.br não encontrado", "Usuário [e-mail] não encontrado"],
    [`token ${JWT} inválido`, "token [token] inválido"],
    ["Authorization: Bearer abc.def-ghi_123==", "Authorization: Bearer [token]"],
    ["chave sb_secret_AbC123-xyz e sb_publishable_Q9w", "chave [chave] e [chave]"],
    ["fetch failed (ECONNREFUSED 127.0.0.1:54321)", "fetch failed (ECONNREFUSED 127.0.0.1:54321)"],
    [42, "42"],
  ])("%j → %j", (text, expected) => {
    expect(redact(text)).toBe(expected)
  })
})

describe("describeError", () => {
  it("erro do Postgres: código e mensagem, sem details/hint (que trazem a linha)", () => {
    const error = {
      name: "PostgrestError",
      code: "23514",
      message: 'new row for relation "clients" violates check constraint "clients_email_check"',
      details: "Failing row contains (…, ana@empresa.com, 123.456.789-09, …).",
      hint: null,
    }
    expect(describeError(error)).toEqual({
      name: "PostgrestError",
      code: "23514",
      message: 'new row for relation "clients" violates check constraint "clients_email_check"',
    })
  })

  it("pilha só com as linhas 'at' (a primeira repete a mensagem) e no máximo 6", () => {
    const error = new TypeError("falhou para ana@empresa.com")
    error.stack = [
      "TypeError: falhou para ana@empresa.com",
      ...Array.from({ length: 9 }, (_, i) => `    at passo${i} (/app/src/lib/x.js:${i}:1)`),
    ].join("\n")
    const info = describeError(error)
    expect(info).toMatchObject({ name: "TypeError", message: "falhou para [e-mail]" })
    expect(info.stack).toEqual(Array.from({ length: 6 }, (_, i) => `at passo${i} (/app/src/lib/x.js:${i}:1)`))
    expect(JSON.stringify(info)).not.toContain("ana@")
  })

  it("stack: false deixa a pilha de fora", () => {
    expect(describeError(new Error("x"), { stack: false })).toEqual({ name: "Error", message: "x" })
  })

  it("leva o digest do Next e a causa (sem pilha), limitada a 2 níveis", () => {
    const deepest = new Error("nível 3")
    const root = new Error("fetch failed", { cause: new Error("nível 1", { cause: new Error("nível 2", { cause: deepest }) }) })
    root.digest = "1234567890"
    const info = describeError(root, { stack: false })
    expect(info).toEqual({
      name: "Error",
      message: "fetch failed",
      digest: "1234567890",
      cause: { name: "Error", message: "nível 1", cause: { name: "Error", message: "nível 2" } },
    })
  })

  it("mensagem longa é cortada", () => {
    const { message } = describeError(new Error("x".repeat(500)))
    expect(message).toHaveLength(301)
    expect(message.endsWith("…")).toBe(true)
  })

  it.each([
    ["texto solto", { message: "texto solto" }],
    [undefined, { message: "undefined" }],
    [{ status: 500, body: "segredo" }, { message: "" }],
  ])("valor que não é Error (%j) não quebra nem vaza campos", (value, expected) => {
    expect(describeError(value)).toEqual(expected)
  })
})

describe("logError", () => {
  it("escreve o escopo, o rótulo e só o resumo seguro", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = Object.assign(new Error(`sessão ${JWT}`), { headers: { cookie: "sb-access-token=abc" } })
    logError("quotes", "erro inesperado", error, { stack: false })
    expect(log).toHaveBeenCalledWith("[quotes] erro inesperado:", { name: "Error", message: "sessão [token]" })
  })
})
