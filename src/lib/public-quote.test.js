import { describe, expect, it } from "vitest"

import { publicQuoteState, whatsappUrl } from "./public-quote"

const TODAY = "2026-10-13"

describe("publicQuoteState", () => {
  it.each([
    [{ status: "sent", valid_until: "2026-10-28" }, "open"],
    [{ status: "viewed", valid_until: "2026-10-13" }, "open"], // vale até o fim do dia
    [{ status: "sent", valid_until: "2026-10-12" }, "expired"], // antes da rotina diária
    [{ status: "expired", valid_until: "2026-10-12" }, "expired"],
    [{ status: "approved", valid_until: "2026-10-01" }, "approved"], // respondida dentro do prazo
    [{ status: "declined", valid_until: "2026-10-28" }, "declined"],
    [{ status: "cancelled" }, "cancelled"], // a versão pública do cancelado não tem validade
  ])("%o → %s", (quote, state) => {
    expect(publicQuoteState(quote, TODAY)).toBe(state)
  })
})

describe("whatsappUrl", () => {
  it.each([
    ["11999998888", "https://wa.me/5511999998888"],
    ["(17) 9721-6930", "https://wa.me/551797216930"],
    [null, null],
    ["123", null],
  ])("%j → %j", (phone, url) => {
    expect(whatsappUrl(phone)).toBe(url)
  })
})
