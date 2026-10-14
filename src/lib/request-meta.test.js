import { describe, expect, it } from "vitest"

import { clientIp, clientUserAgent } from "./request-meta"

describe("clientIp", () => {
  it.each([
    [{ "x-forwarded-for": "203.0.113.7" }, "203.0.113.7"],
    [{ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" }, "203.0.113.7"], // o 1º é o visitante
    [{ "x-forwarded-for": " 2001:db8::1 " }, "2001:db8::1"],
    [{ "x-real-ip": "198.51.100.4" }, "198.51.100.4"],
    [{ "x-forwarded-for": "", "x-real-ip": "198.51.100.4" }, "198.51.100.4"],
    [{ "x-forwarded-for": "não é ip" }, null], // a coluna é inet: texto qualquer seria recusado
    [{ "x-forwarded-for": "203.0.113.7:443" }, null],
    [{}, null],
  ])("%o → %j", (values, ip) => {
    expect(clientIp(new Headers(values))).toBe(ip)
  })
})

describe("clientUserAgent", () => {
  it("devolve o navegador aparado, ou null", () => {
    expect(clientUserAgent(new Headers({ "user-agent": " Mozilla/5.0 " }))).toBe("Mozilla/5.0")
    expect(clientUserAgent(new Headers())).toBeNull()
  })

  it("corta em 500 caracteres contados como o Postgres", () => {
    expect(clientUserAgent(new Headers({ "user-agent": "a".repeat(600) }))).toHaveLength(500)
    // Headers só aceitam ISO-8859-1; o corte por code point vale para qualquer texto.
    const latin = "é".repeat(600)
    expect([...clientUserAgent(new Headers({ "user-agent": latin }))]).toHaveLength(500)
  })
})
