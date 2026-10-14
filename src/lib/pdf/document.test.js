import { describe, expect, it } from "vitest"

import { escapeHtml, pdfFileName, pdfFooterTemplate, quotePdfUrl } from "./document"

describe("pdfFileName", () => {
  it.each([
    ["2026-001", "Proposta-2026-001.pdf"],
    ["2026-1000", "Proposta-2026-1000.pdf"],
    ['2026/001"; x', "Proposta-2026001x.pdf"], // nada que quebre o cabeçalho Content-Disposition
    [null, "Proposta-sem-numero.pdf"],
  ])("%j → %s", (number, name) => {
    expect(pdfFileName(number)).toBe(name)
  })
})

describe("quotePdfUrl", () => {
  it("rota do PDF pela página pública", () => {
    expect(quotePdfUrl("6f1c1d2e-0000-4000-8000-0000000000aa")).toBe("/quote/6f1c1d2e-0000-4000-8000-0000000000aa/pdf")
  })
})

describe("pdfFooterTemplate", () => {
  it("quem enviou, o número e as classes de página do Chrome", () => {
    const html = pdfFooterTemplate({ issuerName: "Ana Freelancer", quoteNumber: "2026-001" })
    expect(html).toContain("Ana Freelancer · Proposta Nº 2026-001")
    expect(html).toContain('Página <span class="pageNumber"></span> de <span class="totalPages"></span>')
    expect(html).toMatch(/font-size:\s*7\.5pt/)
  })

  it("o nome vira texto: não injeta HTML nem as classes especiais do Chrome", () => {
    const html = pdfFooterTemplate({ issuerName: '<img src=x onerror="1"> <span class="url">', quoteNumber: "2026-001" })
    expect(html).not.toContain("<img")
    expect(html).not.toContain('class="url"')
    expect(html).toContain("&lt;img src=x onerror=&quot;1&quot;&gt;")
  })
})

describe("escapeHtml", () => {
  it("escapa os 5 caracteres especiais", () => {
    expect(escapeHtml(`a & b < c > d " e ' f`)).toBe("a &amp; b &lt; c &gt; d &quot; e &#39; f")
    expect(escapeHtml(null)).toBe("")
  })
})
