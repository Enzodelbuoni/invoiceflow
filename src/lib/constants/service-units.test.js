import { describe, expect, it } from "vitest"

import {
  DEFAULT_SERVICE_UNIT,
  SERVICE_UNIT_OPTIONS,
  SERVICE_UNIT_VALUES,
  formatServiceUnit,
  isServiceUnit,
} from "./service-units"

describe("unidades de serviço", () => {
  it("tem as 8 unidades, com hora como padrão", () => {
    expect(SERVICE_UNIT_VALUES).toEqual(["hour", "day", "week", "month", "project", "unit", "page", "word"])
    expect(DEFAULT_SERVICE_UNIT).toBe("hour")
  })

  it("opções do seletor com rótulo em pt-BR", () => {
    expect(SERVICE_UNIT_OPTIONS.map((option) => option.label)).toEqual([
      "Hora",
      "Dia",
      "Semana",
      "Mês",
      "Projeto",
      "Unidade",
      "Página",
      "Palavra",
    ])
  })

  it("isServiceUnit só aceita os valores do banco", () => {
    expect(isServiceUnit("hour")).toBe(true)
    expect(isServiceUnit("hora")).toBe(false)
    expect(isServiceUnit(undefined)).toBe(false)
  })

  it.each([
    ["hour", 1, "hora"],
    ["hour", 1.5, "hora"],
    ["hour", 2, "horas"],
    ["hour", 0, "horas"],
    ["hour", 0.5, "horas"],
    ["month", 3, "meses"],
    ["page", 1, "página"],
    ["unknown", 1, ""],
  ])("formatServiceUnit(%j, %s) → %j", (unit, quantity, expected) => {
    expect(formatServiceUnit(unit, quantity)).toBe(expected)
  })

  it("sem quantidade usa o singular", () => {
    expect(formatServiceUnit("day")).toBe("dia")
  })
})
