import { describe, expect, it } from "vitest"

import { fileNameFromDisposition } from "./pdf-download"

describe("fileNameFromDisposition", () => {
  it.each([
    ['attachment; filename="Proposta-2026-001.pdf"', "Proposta-2026-001.pdf"],
    ['inline; FILENAME="a.pdf"', "a.pdf"],
    ["attachment", null],
    [null, null],
  ])("%j → %j", (header, name) => {
    expect(fileNameFromDisposition(header)).toBe(name)
  })
})
