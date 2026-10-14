import { after } from "next/server"

import { getPublicQuote, registerQuoteDownload } from "@/lib/data/public-quotes"
import { pdfFileName, pdfFooterTemplate } from "@/lib/pdf/document"
import { isPdfAvailable, renderPdf } from "@/lib/pdf/render"
import { siteOrigin } from "@/lib/site-url"

// PDF da proposta (Sprint 16, parte 2): /quote/<public_id>/pdf. Abre a página
// pública num Chrome headless e devolve o arquivo. Vale para o cliente e para o
// dono (o lado do dono usa esta mesma rota). Erros previstos respondem texto em
// pt-BR, que o botão de baixar mostra.

function textResponse(status, message) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  })
}

export async function GET(_request, { params }) {
  const { publicId } = await params

  try {
    const data = await getPublicQuote(publicId)
    // Rascunho e inexistente já vêm null; cancelada não tem documento.
    if (!data || data.quote.status === "cancelled") return textResponse(404, "Proposta não encontrada.")

    // O endereço da página vem da configuração, nunca do Host da requisição (SSRF).
    const origin = siteOrigin()
    if (!isPdfAvailable() || !origin) {
      return textResponse(503, 'O PDF não está disponível agora. Use "Imprimir" e escolha "Salvar como PDF".')
    }

    const { quote, issuer } = data
    const pdf = await renderPdf(`${origin}/quote/${publicId}`, {
      footerTemplate: pdfFooterTemplate({ issuerName: issuer.name, quoteNumber: quote.quote_number }),
    })

    // Depois de responder: "PDF baixado" no histórico (o banco decide quem foi).
    after(() =>
      registerQuoteDownload(publicId).catch(() => {
        // Já registrado no log pela camada de dados; o download em si deu certo.
      }),
    )

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName(quote.quote_number)}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    })
  } catch (error) {
    console.error("[pdf] falha ao gerar:", error?.message ?? error)
    return textResponse(500, 'Não foi possível gerar o PDF. Tente de novo ou use "Imprimir".')
  }
}
