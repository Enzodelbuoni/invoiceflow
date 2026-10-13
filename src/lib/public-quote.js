// Regras da página pública da proposta (Sprint 14).

/**
 * Situação da proposta para quem a recebeu:
 * - "open": enviada/visualizada e dentro da validade (pode ser respondida);
 * - "approved" | "declined": já respondida;
 * - "expired": validade vencida (mesmo antes de a rotina diária marcar);
 * - "cancelled": tirada do ar por quem enviou.
 * @param {{ status: string, valid_until?: string }} quote
 * @param {string} today "AAAA-MM-DD" (São Paulo)
 */
export function publicQuoteState(quote, today) {
  if (quote.status === "cancelled") return "cancelled"
  if (quote.status === "approved") return "approved"
  if (quote.status === "declined") return "declined"
  if (quote.status === "expired") return "expired"
  if (typeof quote.valid_until === "string" && quote.valid_until < today) return "expired"
  return "open"
}

/** "11999998888" → link do WhatsApp com o DDI do Brasil; sem telefone → null. */
export function whatsappUrl(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "")
  if (digits.length < 10) return null
  return `https://wa.me/55${digits}`
}
