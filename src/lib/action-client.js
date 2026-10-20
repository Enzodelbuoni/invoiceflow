import { toast } from "sonner"

// Chamada de Server Actions pelo navegador (Sprint 21). Duas falhas que a
// action em si não consegue responder com uma mensagem:
// - sem conexão (o fetch rejeita, ou o servidor está fora do ar): vira um
//   resultado { ok: false, offline: true } em vez de uma exceção solta;
// - sessão expirada (ex.: saiu da conta em outra aba): a action responde
//   code "unauthenticated" e aparece o aviso com "Entrar novamente".

export const OFFLINE_MESSAGE = "Não foi possível falar com o servidor. Confira sua conexão e tente de novo."

const SESSION_TOAST_ID = "session-expired"

/** O resultado é "sessão expirada"? */
export const isSessionExpired = (result) => result?.ok === false && result.code === "unauthenticated"

/**
 * Aviso de sessão expirada. O login abre numa NOVA aba: esta continua como
 * está (formulário preenchido, diálogo aberto), e depois de entrar a pessoa
 * volta e tenta de novo. Fica na tela até a pessoa agir (id fixo: não empilha).
 */
export function notifySessionExpired() {
  toast.error("Sua sessão expirou", {
    id: SESSION_TOAST_ID,
    description: "Entre de novo (abre em outra aba) e tente outra vez aqui. Nada do que você preencheu se perde.",
    duration: Infinity,
    action: {
      label: "Entrar novamente",
      onClick: () => window.open("/login", "_blank", "noopener"),
    },
  })
}

/**
 * Chama a action sem deixar exceções escaparem.
 * @template T
 * @param {() => Promise<T>} call
 * @returns {Promise<T | { ok: false, offline: true, message: string }>}
 */
export async function runAction(call) {
  let result
  try {
    result = await call()
  } catch {
    return { ok: false, offline: true, message: OFFLINE_MESSAGE }
  }
  if (isSessionExpired(result)) notifySessionExpired()
  // Entrou de novo (em outra aba) e a ação deu certo: o aviso antigo sai.
  else if (result?.ok) toast.dismiss(SESSION_TOAST_ID)
  return result
}
