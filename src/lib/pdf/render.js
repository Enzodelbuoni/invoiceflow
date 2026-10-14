import "server-only"
import puppeteer from "puppeteer-core"

// Gera o PDF abrindo uma página do próprio app num Chrome headless (Sprint 16,
// parte 2): o mesmo HTML/CSS da tela e da impressão (QuotePreview + regras de
// @media print), sem um segundo layout.
//
// O Chrome vem de PDF_CHROME_PATH (em desenvolvimento, o Chrome instalado na
// máquina). No deploy (Vercel) será um Chromium próprio para Linux, como o
// @sparticuz/chromium; sem ele configurado, o app oferece só a impressão.

const RENDER_TIMEOUT_MS = 20_000

/** Caminho do Chrome para gerar PDFs, ou null. */
function chromePath() {
  return process.env.PDF_CHROME_PATH || null
}

/** O servidor sabe gerar PDF? (sem isso, a interface oferece só "Imprimir") */
export function isPdfAvailable() {
  return Boolean(chromePath())
}

/**
 * Abre `url` com o JavaScript DESLIGADO (o documento é Server Component; com JS,
 * a página pública marcaria a proposta como visualizada) e devolve o PDF em A4
 * (tamanho e margens do @page), com fundos e o rodapé `footerTemplate`.
 * @returns {Promise<Uint8Array>}
 */
export async function renderPdf(url, { footerTemplate }) {
  const executablePath = chromePath()
  if (!executablePath) throw new Error("PDF_CHROME_PATH não configurado")

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--disable-gpu", "--no-first-run", "--no-default-browser-check"],
  })
  try {
    const page = await browser.newPage()
    await page.setJavaScriptEnabled(false)
    const response = await page.goto(url, { waitUntil: "networkidle0", timeout: RENDER_TIMEOUT_MS })
    if (!response?.ok()) throw new Error(`a página de origem respondeu ${response?.status() ?? "sem resposta"}`)
    return await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate,
      timeout: RENDER_TIMEOUT_MS,
    })
  } finally {
    await browser.close()
  }
}
