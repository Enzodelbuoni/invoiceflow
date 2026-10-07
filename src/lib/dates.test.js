import { describe, expect, it } from "vitest"

import {
  addDaysIso,
  daysBetweenIso,
  describeDaysFromToday,
  formatIsoDateLong,
  formatIsoDateShort,
  isIsoDate,
  todayIso,
} from "./dates"

describe("isIsoDate", () => {
  it.each(["2026-10-07", "2024-02-29", "2026-12-31"])("aceita %s", (value) => {
    expect(isIsoDate(value)).toBe(true)
  })

  it.each(["2026-02-29", "2026-02-31", "2026-13-01", "2026-10-7", "07/10/2026", "", null, undefined])(
    "recusa %s",
    (value) => {
      expect(isIsoDate(value)).toBe(false)
    },
  )
})

describe("todayIso (fuso de São Paulo, UTC−3)", () => {
  it("de madrugada em UTC ainda é o dia anterior no Brasil", () => {
    expect(todayIso(new Date("2026-10-08T02:59:00Z"))).toBe("2026-10-07")
    expect(todayIso(new Date("2026-10-08T03:00:00Z"))).toBe("2026-10-08")
  })

  it("virada do ano", () => {
    expect(todayIso(new Date("2027-01-01T02:00:00Z"))).toBe("2026-12-31")
  })
})

describe("addDaysIso", () => {
  it.each([
    ["2026-10-07", 15, "2026-10-22"],
    ["2026-10-20", 15, "2026-11-04"],
    ["2026-12-25", 7, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2026-10-07", 0, "2026-10-07"],
    ["2026-10-07", -7, "2026-09-30"],
  ])("%s + %i → %s", (iso, days, expected) => {
    expect(addDaysIso(iso, days)).toBe(expected)
  })

  it("recusa data inválida", () => {
    expect(() => addDaysIso("2026-02-31", 1)).toThrow(RangeError)
  })
})

describe("daysBetweenIso", () => {
  it.each([
    ["2026-10-07", "2026-10-22", 15],
    ["2026-10-22", "2026-10-07", -15],
    ["2026-12-31", "2027-01-01", 1],
    ["2026-10-07", "2026-10-07", 0],
  ])("%s → %s = %i", (from, to, expected) => {
    expect(daysBetweenIso(from, to)).toBe(expected)
  })

  it("NaN com data inválida", () => {
    expect(daysBetweenIso("2026-10-07", "")).toBeNaN()
  })
})

describe("formatIsoDateLong", () => {
  it("formata sem deslocar o dia pelo fuso", () => {
    expect(formatIsoDateLong("2026-10-22")).toBe("Quinta-feira, 22 de outubro de 2026")
    expect(formatIsoDateLong("2027-01-01")).toBe("Sexta-feira, 1 de janeiro de 2027")
  })

  it('data inválida → ""', () => {
    expect(formatIsoDateLong("2026-02-31")).toBe("")
  })
})

describe("formatIsoDateShort", () => {
  it("formata sem deslocar o dia pelo fuso", () => {
    expect(formatIsoDateShort("2026-10-22")).toBe("22 de out. de 2026")
    expect(formatIsoDateShort("2027-01-01")).toBe("1 de jan. de 2027")
  })

  it('data inválida → ""', () => {
    expect(formatIsoDateShort("")).toBe("")
  })
})

describe("describeDaysFromToday", () => {
  it.each([
    [0, "hoje"],
    [1, "amanhã"],
    [15, "em 15 dias"],
    [-1, "ontem"],
    [-3, "há 3 dias"],
  ])("%i → %s", (days, expected) => {
    expect(describeDaysFromToday(days)).toBe(expected)
  })
})
