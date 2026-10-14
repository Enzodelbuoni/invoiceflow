import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getPublicQuote, registerQuoteDownload } from "@/lib/data/public-quotes"
import { isPdfAvailable, renderPdf } from "@/lib/pdf/render"

import { GET } from "./route"

// A rota em si, com o banco e o Chrome trocados por falsos: o que ela devolve
// em cada caso, de onde abre a página (nunca do Host da requisição) e o
// registro do download depois da resposta.
vi.mock("next/server", () => ({ after: vi.fn((callback) => callback()) }))
vi.mock("@/lib/data/public-quotes", () => ({ getPublicQuote: vi.fn(), registerQuoteDownload: vi.fn() }))
vi.mock("@/lib/pdf/render", () => ({ isPdfAvailable: vi.fn(), renderPdf: vi.fn() }))

const PUBLIC_ID = "6f1c1d2e-0000-4000-8000-0000000000aa"
const DOC = {
  quote: { quote_number: "2026-001", status: "sent" },
  issuer: { name: "Ana Freelancer" },
}

/** Chama a rota como o Next chama (params é uma Promise), com um Host forjado. */
function call(publicId = PUBLIC_ID) {
  const request = new Request(`http://localhost:3000/quote/${publicId}/pdf`, { headers: { host: "169.254.169.254" } })
  return GET(request, { params: Promise.resolve({ publicId }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://invoiceflow.app")
  isPdfAvailable.mockReturnValue(true)
  getPublicQuote.mockResolvedValue(DOC)
  renderPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
  registerQuoteDownload.mockResolvedValue()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("GET /quote/[publicId]/pdf", () => {
  it("devolve o PDF como download, aberto a partir do endereço configurado", async () => {
    const response = await call()
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/pdf")
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="Proposta-2026-001.pdf"')
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70]))

    const [url, { footerTemplate }] = renderPdf.mock.calls[0]
    expect(url).toBe(`https://invoiceflow.app/quote/${PUBLIC_ID}`) // nunca o Host forjado
    expect(footerTemplate).toContain("Ana Freelancer · Proposta Nº 2026-001")
    expect(registerQuoteDownload).toHaveBeenCalledWith(PUBLIC_ID)
  })

  it.each([
    ["inexistente ou rascunho", null],
    ["cancelada", { ...DOC, quote: { ...DOC.quote, status: "cancelled" } }],
  ])("%s → 404 em texto, sem gerar nem registrar", async (_case, data) => {
    getPublicQuote.mockResolvedValue(data)
    const response = await call()
    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Proposta não encontrada.")
    expect(renderPdf).not.toHaveBeenCalled()
    expect(registerQuoteDownload).not.toHaveBeenCalled()
  })

  it.each([
    ["sem Chrome configurado", () => isPdfAvailable.mockReturnValue(false)],
    ["sem endereço do site", () => vi.stubEnv("NEXT_PUBLIC_SITE_URL", "")],
    ["endereço do site inválido", () => vi.stubEnv("NEXT_PUBLIC_SITE_URL", "file:///etc")],
  ])("%s → 503 sugerindo imprimir", async (_case, setup) => {
    setup()
    const response = await call()
    expect(response.status).toBe(503)
    expect(await response.text()).toContain("Imprimir")
    expect(renderPdf).not.toHaveBeenCalled()
  })

  it("falha do Chrome → 500 em texto, sem registrar download", async () => {
    renderPdf.mockRejectedValue(new Error("timeout"))
    const response = await call()
    expect(response.status).toBe(500)
    expect(response.headers.get("Content-Type")).toContain("text/plain")
    expect(await response.text()).toContain("Não foi possível gerar o PDF")
    expect(registerQuoteDownload).not.toHaveBeenCalled()
  })

  it("falha ao registrar o download não estraga o PDF", async () => {
    registerQuoteDownload.mockRejectedValue(new Error("banco fora"))
    const response = await call()
    expect(response.status).toBe(200)
  })
})
