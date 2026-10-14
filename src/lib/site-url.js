// Endereço público do app (NEXT_PUBLIC_SITE_URL). O servidor usa este valor,
// e nunca o cabeçalho Host da requisição, quando precisa abrir uma página do
// próprio app (ex.: o gerador de PDF): um Host forjado poderia apontar o
// gerador para um endereço interno (SSRF).

/** Origem do site ("https://app.exemplo.com"), ou null se ausente ou inválida. Só http/https. */
export function siteOrigin(value = process.env.NEXT_PUBLIC_SITE_URL) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null
  } catch {
    return null
  }
}
