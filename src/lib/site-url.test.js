import { describe, expect, it } from "vitest"

import { siteOrigin } from "./site-url"

describe("siteOrigin", () => {
  it.each([
    ["http://localhost:3000", "http://localhost:3000"],
    ["https://invoiceflow.app/", "https://invoiceflow.app"],
    ["https://invoiceflow.app/algum/caminho?x=1", "https://invoiceflow.app"],
    ["", null],
    [undefined, null],
    ["não é url", null],
    ["file:///etc/passwd", null],
    ["javascript:alert(1)", null],
  ])("%j → %j", (value, origin) => {
    expect(siteOrigin(value)).toBe(origin)
  })
})
