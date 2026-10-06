// Rotas da área privada (exigem login) e telas que só fazem sentido deslogado.
export const PROTECTED_PREFIXES = ["/dashboard", "/clients", "/services", "/quotes", "/settings"]
export const GUEST_ONLY_PATHS = ["/login", "/signup", "/forgot-password"]

export const DEFAULT_AFTER_LOGIN = "/dashboard"

export function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

const INTERNAL_ORIGIN = "http://invoiceflow.internal"

/**
 * Valida o destino vindo da URL (?next=...) para evitar redirecionamento aberto:
 * só aceita caminhos internos como "/quotes/123". Qualquer outra coisa
 * (URL absoluta, "//site.com", "/\site.com", "/\t/site.com") vira o `fallback`.
 * Usa o parser de URL padrão (o mesmo dos navegadores), que normaliza barras
 * invertidas, tabs e quebras de linha do jeito que o navegador faria.
 */
export function getSafeRedirect(next, fallback = DEFAULT_AFTER_LOGIN) {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback
  try {
    const url = new URL(next, INTERNAL_ORIGIN)
    if (url.origin !== INTERNAL_ORIGIN) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
