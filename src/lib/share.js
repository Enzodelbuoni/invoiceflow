import { formatIsoDateShort } from "@/lib/dates"
import { formatCurrency } from "@/lib/money"
import { siteOrigin } from "@/lib/site-url"

// Compartilhar a proposta com o cliente (Sprint 17): link público, mensagem
// pronta e os links de WhatsApp e e-mail. Funções puras (testadas); quem chama
// decide a origem quando o endereço do site não está configurado.

/**
 * Link da página pública da proposta. A origem vem do endereço configurado do
 * site (link estável, igual em qualquer lugar de onde o dono copie); sem ele,
 * a de quem chamou (ex.: window.location.origin).
 */
export function publicQuoteUrl(publicId, fallbackOrigin) {
  const origin = siteOrigin() ?? fallbackOrigin
  return `${origin}/quote/${publicId}`
}

/**
 * Mensagem pronta para mandar ao cliente (a pessoa pode editar antes).
 * @param {{ clientName?: string|null, quoteNumber: string, title: string,
 *   totalCents: number, validUntil: string, url: string }} values
 */
export function shareMessage({ clientName, quoteNumber, title, totalCents, validUntil, url }) {
  const greeting = clientName?.trim() ? `Olá, ${clientName.trim()}! Tudo bem?` : "Olá! Tudo bem?"
  return [
    greeting,
    "",
    `Segue a proposta "${title}" (Nº ${quoteNumber}), no valor de ${formatCurrency(totalCents)}, válida até ${formatIsoDateShort(validUntil)}.`,
    "",
    `Você pode ver os detalhes e aprovar por aqui: ${url}`,
  ].join("\n")
}

/**
 * Link do WhatsApp ("clique para conversar"): wa.me/<número com DDI, só
 * dígitos>?text=<mensagem>. Telefones do app são brasileiros com DDD (10 ou 11
 * dígitos) e ganham o 55; com 12/13 dígitos começando por 55, o DDI já está lá.
 * Sem telefone (ou inválido), wa.me/?text=… abre a lista de contatos.
 */
export function whatsappUrl(phone, text) {
  const digits = String(phone ?? "").replace(/\D/g, "")
  let number = ""
  if (digits.length === 10 || digits.length === 11) number = `55${digits}`
  else if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) number = digits
  const query = text ? `?text=${encodeURIComponent(text)}` : ""
  if (!number && !query) return null
  return `https://wa.me/${number}${query}`
}

/** Link de e-mail com assunto e corpo (encodeURIComponent: espaço vira %20, como o mailto pede). */
export function mailtoUrl({ email, subject, body }) {
  const params = [
    subject && `subject=${encodeURIComponent(subject)}`,
    body && `body=${encodeURIComponent(body)}`,
  ].filter(Boolean)
  return `mailto:${email ?? ""}${params.length > 0 ? `?${params.join("&")}` : ""}`
}
