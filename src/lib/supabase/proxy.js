import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"

import { DEFAULT_AFTER_LOGIN, GUEST_ONLY_PATHS, isProtectedPath, isServerActionRequest, loginPath } from "@/lib/auth/redirect"
import { isSupabaseConfigured } from "./env"

// Redireciona preservando os cookies de sessão que o Supabase acabou de renovar.
// Sem isso, navegador e servidor saem de sincronia e o usuário é deslogado.
function redirectWithCookies(url, sessionResponse) {
  const response = NextResponse.redirect(url)
  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  return response
}

/**
 * Executado pelo src/proxy.js em toda requisição de página:
 * 1. renova o token de acesso do Supabase (e devolve os cookies atualizados);
 * 2. manda quem não está logado da área privada para /login?next=...;
 * 3. manda quem já está logado de /login, /signup e /forgot-password para o dashboard.
 *
 * Adaptado do exemplo oficial do Supabase para Next.js 16 (with-supabase).
 */
export async function updateSession(request) {
  let response = NextResponse.next({ request })

  // Sem .env.local (modo demonstração), o app funciona sem autenticação.
  if (!isSupabaseConfigured()) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // IMPORTANTE (documentação do Supabase): não executar nada entre o
  // createServerClient e o getClaims(), senão usuários podem ser deslogados
  // aleatoriamente. O getClaims() valida o JWT; nunca usar getSession() para autorizar.
  const { data } = await supabase.auth.getClaims()
  const isLoggedIn = Boolean(data?.claims)

  const { pathname, search } = request.nextUrl

  // Server Actions passam: a action confere o login e responde "sessão expirada"
  // (redirecionada, ela receberia a página de login no lugar da resposta).
  if (!isLoggedIn && isProtectedPath(pathname) && !isServerActionRequest(request.headers)) {
    return redirectWithCookies(new URL(loginPath(pathname + search), request.url), response)
  }

  if (isLoggedIn && GUEST_ONLY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = DEFAULT_AFTER_LOGIN
    url.search = ""
    return redirectWithCookies(url, response)
  }

  return response
}
