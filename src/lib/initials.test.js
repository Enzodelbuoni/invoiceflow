import { describe, expect, it } from "vitest"

import { initials } from "./initials"

describe("initials", () => {
  it.each([
    ["Ana Souza", "AS"],
    ["Ana Maria Souza", "AS"],
    ["  estúdio  ", "ES"],
    ["", "?"],
    [null, "?"],
  ])("%j → %s", (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})
