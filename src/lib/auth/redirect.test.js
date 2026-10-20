import { describe, expect, it } from "vitest"

import { getSafeRedirect, isProtectedPath, isServerActionRequest, loginPath } from "./redirect"

describe("isProtectedPath", () => {
  it.each([
    ["/dashboard", true],
    ["/quotes", true],
    ["/quotes/123/edit", true],
    ["/clients/abc", true],
    // Página pública da proposta: o cliente abre sem conta (Sprint 14).
    ["/quote/6f1c1d2e-0000-4000-8000-000000000001", false],
    ["/quotesx", false],
    ["/", false],
    ["/login", false],
  ])("%s → %s", (pathname, expected) => {
    expect(isProtectedPath(pathname)).toBe(expected)
  })
})

describe("getSafeRedirect", () => {
  it.each([
    ["/quotes/123", "/quotes/123"],
    ["/quotes?page=2#x", "/quotes?page=2#x"],
    ["https://site.com", "/dashboard"],
    ["//site.com", "/dashboard"],
    ["/\\site.com", "/dashboard"], // o navegador lê "/\" como "//"
    [undefined, "/dashboard"],
  ])("%j → %j", (next, expected) => {
    expect(getSafeRedirect(next)).toBe(expected)
  })
})

describe("loginPath", () => {
  it.each([
    ["/quotes/123?pagina=2", "/login?next=%2Fquotes%2F123%3Fpagina%3D2"],
    ["/clients/new", "/login?next=%2Fclients%2Fnew"],
    // destino externo ou inválido: login sem volta
    ["//site.com", "/login"],
    ["https://site.com", "/login"],
    [undefined, "/login"],
  ])("%j → %j", (next, expected) => {
    expect(loginPath(next)).toBe(expected)
  })
})

describe("isServerActionRequest", () => {
  it("reconhece o cabeçalho Next-Action (o proxy não redireciona esses pedidos)", () => {
    expect(isServerActionRequest(new Headers({ "Next-Action": "7f3a" }))).toBe(true)
    expect(isServerActionRequest(new Headers({ accept: "text/html" }))).toBe(false)
  })
})
