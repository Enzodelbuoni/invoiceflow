import { describe, expect, it } from "vitest"

import { getSafeRedirect, isProtectedPath } from "./redirect"

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
