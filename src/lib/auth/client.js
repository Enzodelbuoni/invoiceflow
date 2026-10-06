// Camada de autenticação usada pelos formulários e pelo menu do usuário.
//
// TODO(etapa 6): trocar a simulação abaixo pelo Supabase Auth. Os formulários só
// conhecem estas funções e o AuthError, então a interface deve continuar igual.

/** Enquanto for `true`, nenhuma chamada sai do navegador: tudo é simulado. */
export const AUTH_DEMO_MODE = true

/** Erro de autenticação com mensagem pronta para o usuário (pt-BR). */
export class AuthError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "AuthError"
    this.code = code
  }
}

const GENERIC_ERROR = "Não foi possível concluir agora. Verifique sua conexão e tente novamente."

/** Mensagem segura para exibir, seja qual for o erro recebido. */
export function getAuthErrorMessage(error) {
  return error instanceof AuthError ? error.message : GENERIC_ERROR
}

const simulateLatency = (ms = 900) => new Promise((resolve) => setTimeout(resolve, ms))

export async function signIn({ email, password }) {
  await simulateLatency()
}

export async function signUp({ name, email, password }) {
  await simulateLatency(1100)
}

export async function signOut() {
  await simulateLatency(300)
}

/** Envia o e-mail com o link de nova senha. Não revela se o e-mail tem conta. */
export async function requestPasswordReset({ email }) {
  await simulateLatency()
}

/**
 * Define a nova senha. No Supabase, o link do e-mail já abriu uma sessão de
 * recuperação (rota /auth/confirm); aqui basta `auth.updateUser({ password })`.
 */
export async function confirmPasswordReset({ password }) {
  await simulateLatency()
}
