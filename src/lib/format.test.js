import { describe, expect, it } from "vitest"

import { formatShortDate, formatShortDateCompact } from "./format"

describe("formatShortDate", () => {
  it("dia, mês abreviado e ano, no fuso de São Paulo", () => {
    expect(formatShortDate("2026-10-19T15:00:00Z")).toBe("19 de out. de 2026")
    // 01:00 UTC de 20/10 = 22:00 de 19/10 em São Paulo
    expect(formatShortDate("2026-10-20T01:00:00Z")).toBe("19 de out. de 2026")
  })
})

describe("formatShortDateCompact", () => {
  const now = new Date("2026-10-19T15:00:00Z")

  it("no mesmo ano, sem o ano", () => {
    expect(formatShortDateCompact("2026-03-02T12:00:00Z", now)).toBe("2 de mar.")
  })

  it("em outro ano, com o ano", () => {
    expect(formatShortDateCompact("2025-12-30T12:00:00Z", now)).toBe("30 de dez. de 2025")
  })

  it("o ano é o de São Paulo (virada do ano em UTC)", () => {
    // 02:00 UTC de 01/01/2027 = 23:00 de 31/12/2026 em São Paulo: ainda 2026
    expect(formatShortDateCompact("2027-01-01T02:00:00Z", now)).toBe("31 de dez.")
  })
})
