// Site (ou rede social) do negócio, que aparece na proposta. Guardado com o
// protocolo (o CHECK do banco exige http/https, então nunca vira um link
// javascript:); na tela, sem ele.

/** "meusite.com.br" → "https://meusite.com.br"; com http(s), fica como veio. */
export function normalizeWebsite(value) {
  const text = String(value ?? "").trim()
  if (!text) return ""
  return /^https?:\/\//i.test(text) ? text : `https://${text}`
}

/**
 * Endereço http(s) com domínio (tem ponto), sem espaços e sem usuário/senha
 * ("https://banco.com@golpe.com" engana quem lê).
 */
export function isValidWebsite(url) {
  if (/\s/.test(url)) return false
  try {
    const { protocol, hostname, username, password } = new URL(url)
    return (
      (protocol === "http:" || protocol === "https:") &&
      !username &&
      !password &&
      /^[^.]+(\.[^.]+)+$/.test(hostname)
    )
  } catch {
    return false
  }
}

/** Para mostrar na proposta: sem protocolo e sem a barra final ("meusite.com.br/portfolio"). */
export function displayWebsite(url) {
  return String(url ?? "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
}

/** Para o campo do formulário: só o "https://" sai (um "http://" digitado continua à vista). */
export function websiteFormValue(url) {
  return String(url ?? "").replace(/^https:\/\//i, "")
}
