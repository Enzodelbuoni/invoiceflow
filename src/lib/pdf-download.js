import { OFFLINE_MESSAGE } from "@/lib/action-client"

// Baixar o PDF da proposta no navegador (Sprint 16, parte 2). Em vez de um link
// direto, busca o arquivo com fetch: dá para mostrar "Gerando PDF…" (leva uns
// segundos) e explicar o erro, quando houver.

const FAILED = 'Não foi possível gerar o PDF. Tente de novo ou use "Imprimir".'

/** 'attachment; filename="Proposta-2026-001.pdf"' → "Proposta-2026-001.pdf"; sem nome → null. */
export function fileNameFromDisposition(header) {
  const match = /filename="([^"]+)"/i.exec(header ?? "")
  return match ? match[1] : null
}

/**
 * Busca o PDF em `url` e salva no aparelho. Erro → Error com a mensagem para a
 * pessoa (a rota responde texto em pt-BR nos erros previstos).
 */
export async function downloadPdf(url, fallbackName) {
  let response
  try {
    response = await fetch(url, { cache: "no-store" })
  } catch {
    throw new Error(OFFLINE_MESSAGE)
  }
  if (!response.ok) {
    const isText = response.headers.get("Content-Type")?.startsWith("text/plain")
    const message = isText ? (await response.text()).trim() : ""
    throw new Error(message || FAILED)
  }

  const blob = await response.blob()
  const href = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = href
  link.download = fileNameFromDisposition(response.headers.get("Content-Disposition")) ?? fallbackName
  document.body.append(link)
  link.click()
  link.remove()
  // Alguns navegadores ainda leem o arquivo logo depois do clique.
  setTimeout(() => URL.revokeObjectURL(href), 30_000)
}
