// Peças do PDF da proposta que não dependem do navegador (Sprint 16, parte 2):
// nome do arquivo e rodapé de cada página. Usadas pela rota que gera o PDF e
// pelo botão de baixar.

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }

/** Texto → HTML seguro (o rodapé é um trecho de HTML montado com o nome de quem enviou). */
export function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}

/** Rota que gera o PDF da proposta (mesma para o cliente e para o dono). */
export function quotePdfUrl(publicId) {
  return `/quote/${publicId}/pdf`
}

/** "2026-001" → "Proposta-2026-001.pdf" (só letras, números e hífen no nome do arquivo). */
export function pdfFileName(quoteNumber) {
  const safe = String(quoteNumber ?? "").replace(/[^0-9A-Za-z-]/g, "")
  return `Proposta-${safe || "sem-numero"}.pdf`
}

/**
 * Rodapé de cada página do PDF: quem enviou e o número da proposta à esquerda,
 * "Página X de Y" à direita. É o footerTemplate do Chrome: as classes
 * pageNumber/totalPages são preenchidas por ele, e o tamanho da fonte precisa
 * ser explícito (o padrão é minúsculo). Fontes da web não carregam aqui.
 */
export function pdfFooterTemplate({ issuerName, quoteNumber }) {
  return [
    '<div style="width:100%;padding:0 12mm;display:flex;justify-content:space-between;gap:12px;',
    "font-family:Inter,'Segoe UI',Arial,sans-serif;font-size:7.5pt;color:#6b7280\">",
    `<span>${escapeHtml(issuerName)} · Proposta Nº ${escapeHtml(quoteNumber)}</span>`,
    '<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>',
    "</div>",
  ].join("")
}
