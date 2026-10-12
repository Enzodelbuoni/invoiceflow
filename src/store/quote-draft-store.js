import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

// Store do rascunho local do construtor (Sprint 9). Zustand aqui guarda só um
// dado TEMPORÁRIO que não cabe no React Hook Form (que some ao fechar a aba)
// nem no Supabase (o orçamento ainda não foi salvo): uma cópia de segurança do
// que está sendo digitado, por usuário, neste navegador. As regras ficam em
// lib/quote-draft.js.

export const QUOTE_DRAFT_STORAGE_KEY = "invoiceflow:quote-draft"

// O localStorage pode não existir (servidor) ou falhar (modo privado, cota
// cheia). Qualquer falha vira "sem rascunho": o construtor continua funcionando.
const safeLocalStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value)
    } catch {
      // Sem espaço ou bloqueado: segue sem cópia de segurança.
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name)
    } catch {
      // Idem.
    }
  },
}

/**
 * `drafts`: { [userId]: { values, savedAt } }. Por usuário, para uma pessoa
 * que entrar com outra conta no mesmo navegador não ver o rascunho da outra.
 * `skipHydration`: o servidor não tem localStorage; quem usa chama
 * `useQuoteDraftStore.persist.rehydrate()` depois de montar (senão o HTML do
 * servidor e o primeiro render do navegador divergiriam).
 */
export const useQuoteDraftStore = create(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (userId, values) =>
        set((state) => ({ drafts: { ...state.drafts, [userId]: { values, savedAt: new Date().toISOString() } } })),
      removeDraft: (userId) =>
        set((state) => {
          if (!(userId in state.drafts)) return state
          const drafts = { ...state.drafts }
          delete drafts[userId]
          return { drafts }
        }),
    }),
    {
      name: QUOTE_DRAFT_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({ drafts: state.drafts }),
      skipHydration: true,
    },
  ),
)

/** Apaga os rascunhos deste navegador (ao sair da conta, num computador compartilhado). */
export function clearQuoteDrafts() {
  useQuoteDraftStore.setState({ drafts: {} })
  useQuoteDraftStore.persist.clearStorage()
}
