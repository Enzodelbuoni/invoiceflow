import { afterEach, describe, expect, it, vi } from "vitest"

import { formatCurrency } from "@/lib/money"

import { mailtoUrl, publicQuoteUrl, shareMessage, whatsappUrl } from "./share"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("publicQuoteUrl", () => {
  it("usa o endereço configurado do site (link estável)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://invoiceflow.app/")
    expect(publicQuoteUrl("abc", "http://localhost:3000")).toBe("https://invoiceflow.app/quote/abc")
  })

  it("sem endereço configurado, a origem de quem chamou", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "")
    expect(publicQuoteUrl("abc", "http://localhost:3000")).toBe("http://localhost:3000/quote/abc")
  })
})

describe("shareMessage", () => {
  const values = {
    clientName: "Bruno Cliente",
    quoteNumber: "2026-001",
    title: "Identidade visual",
    totalCents: 500000,
    validUntil: "2026-10-29",
    url: "https://invoiceflow.app/quote/abc",
  }

  it("cumprimenta, resume a proposta e manda o link", () => {
    expect(shareMessage(values)).toBe(
      [
        "Olá, Bruno Cliente! Tudo bem?",
        "",
        // O Intl separa "R$" do número com espaço não separável (U+00A0).
        `Segue a proposta "Identidade visual" (Nº 2026-001), no valor de ${formatCurrency(500000)}, válida até 29 de out. de 2026.`,
        "",
        "Você pode ver os detalhes e aprovar por aqui: https://invoiceflow.app/quote/abc",
      ].join("\n"),
    )
  })

  it("sem nome do cliente, cumprimento genérico", () => {
    expect(shareMessage({ ...values, clientName: null }).split("\n")[0]).toBe("Olá! Tudo bem?")
    expect(shareMessage({ ...values, clientName: "  " }).split("\n")[0]).toBe("Olá! Tudo bem?")
  })
})

describe("whatsappUrl", () => {
  it.each([
    ["11999998888", undefined, "https://wa.me/5511999998888"],
    ["(17) 9721-6930", undefined, "https://wa.me/551797216930"], // fixo, 10 dígitos
    ["5511999998888", undefined, "https://wa.me/5511999998888"], // já com o DDI
    ["+55 (11) 99999-8888", undefined, "https://wa.me/5511999998888"],
    [null, undefined, null],
    ["123", undefined, null],
    ["11999998888", "Olá & tchau #1\nlinha 2", "https://wa.me/5511999998888?text=Ol%C3%A1%20%26%20tchau%20%231%0Alinha%202"],
    [null, "Oi", "https://wa.me/?text=Oi"], // sem telefone: a pessoa escolhe o contato
    ["123", "Oi", "https://wa.me/?text=Oi"],
  ])("%j + %j → %j", (phone, text, url) => {
    expect(whatsappUrl(phone, text)).toBe(url)
  })
})

describe("mailtoUrl", () => {
  it("assunto e corpo codificados (espaço vira %20)", () => {
    expect(mailtoUrl({ email: "bruno@cliente.com", subject: "Proposta Nº 2026-001", body: "Olá!\nLink: https://x/q?a=1&b=2" })).toBe(
      "mailto:bruno@cliente.com?subject=Proposta%20N%C2%BA%202026-001&body=Ol%C3%A1!%0ALink%3A%20https%3A%2F%2Fx%2Fq%3Fa%3D1%26b%3D2",
    )
  })

  it("sem e-mail: a pessoa escolhe o destinatário", () => {
    expect(mailtoUrl({ email: null, subject: "Oi" })).toBe("mailto:?subject=Oi")
    expect(mailtoUrl({ email: "a@b.com" })).toBe("mailto:a@b.com")
  })
})
