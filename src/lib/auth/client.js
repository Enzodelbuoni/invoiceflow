// Camada de autenticação usada pelos formulários e pelo menu do usuário.
// Os componentes só conhecem estas funções e o AuthError: trocar de provedor
// (ou de estratégia) não exige mexer nos formulários.

import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/env"

/**
 * Sem as variáveis do Supabase no .env.local, tudo é simulado (nada sai do
 * navegador). Com elas, o Supabase Auth é usado de verdade.
 */
export const AUTH_DEMO_MODE = !isSupabaseConfigured()

/** Erro de autenticação com mensagem pronta para o usuário (pt-BR). */
export class AuthError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "AuthError"
    this.code = code
  }
}

const GENERIC_ERROR = "Não foi possível concluir agora. Verifique sua conexão e tente novamente."

// Códigos do Supabase Auth (@supabase/auth-js, lib/error-codes) → mensagens pt-BR.
const MESSAGES = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Procure o link que enviamos para você.",
  user_already_exists: "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.",
  email_exists: "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.",
  weak_password: "Essa senha é fraca demais. Use pelo menos 8 caracteres, com letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_request_rate_limit: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
  over_email_send_rate_limit: "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.",
  email_address_invalid: "Este endereço de e-mail não é aceito. Use outro.",
  // O serviço de e-mail padrão do Supabase só entrega para a equipe do projeto.
  email_address_not_authorized: "Não conseguimos enviar e-mails para este endereço no momento.",
  signup_disabled: "Novos cadastros estão desativados no momento.",
  user_banned: "Esta conta está bloqueada. Fale com o suporte.",
  session_not_found: "Sua sessão expirou. Peça um novo link de recuperação.",
  session_expired: "Sua sessão expirou. Peça um novo link de recuperação.",
}

function toAuthError(error) {
  if (error instanceof AuthError) return error
  if (error?.name === "AuthSessionMissingError") {
    return new AuthError("session_missing", MESSAGES.session_not_found)
  }
  const code = error?.code
  return new AuthError(code ?? "unknown", MESSAGES[code] ?? GENERIC_ERROR)
}

/** Mensagem segura para exibir, seja qual for o erro recebido. */
export function getAuthErrorMessage(error) {
  return error instanceof AuthError ? error.message : GENERIC_ERROR
}

const simulateLatency = (ms = 900) => new Promise((resolve) => setTimeout(resolve, ms))

/** URL de retorno dos links de e-mail (precisa estar nas Redirect URLs do Supabase). */
function emailRedirectTo(next) {
  return `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`
}

/** Executa uma chamada do Supabase e converte o `error` retornado em AuthError. */
async function run(call) {
  let result
  try {
    result = await call(createClient())
  } catch (error) {
    throw toAuthError(error)
  }
  if (result.error) throw toAuthError(result.error)
  return result.data
}

export async function signIn({ email, password }) {
  if (AUTH_DEMO_MODE) return simulateLatency()
  await run((supabase) => supabase.auth.signInWithPassword({ email, password }))
}

/**
 * Cria a conta. O nome vai para os metadados e o gatilho do banco o copia
 * para `profiles`. Se a confirmação de e-mail estiver ligada no Supabase,
 * não há sessão ainda: `needsEmailConfirmation` vem `true`.
 */
export async function signUp({ name, email, password }) {
  if (AUTH_DEMO_MODE) {
    await simulateLatency(1100)
    return { needsEmailConfirmation: false }
  }
  const data = await run((supabase) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name }, emailRedirectTo: emailRedirectTo("/dashboard") },
    })
  )
  return { needsEmailConfirmation: !data.session }
}

export async function signOut() {
  if (AUTH_DEMO_MODE) return simulateLatency(300)
  await run((supabase) => supabase.auth.signOut())
}

/**
 * Envia o e-mail com o link de nova senha. O link volta para /auth/confirm, que
 * abre a sessão de recuperação e leva para /reset-password. Precisa ser aberto
 * no mesmo navegador (fluxo PKCE). Não revela se o e-mail tem conta.
 */
export async function requestPasswordReset({ email }) {
  if (AUTH_DEMO_MODE) return simulateLatency()
  await run((supabase) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: emailRedirectTo("/reset-password") })
  )
}

/** Define a nova senha na sessão de recuperação aberta pelo link do e-mail. */
export async function confirmPasswordReset({ password }) {
  if (AUTH_DEMO_MODE) return simulateLatency()
  await run((supabase) => supabase.auth.updateUser({ password }))
}
