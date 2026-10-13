"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { hasDraftContent, isDraftExpired, sanitizeDraftValues } from "@/lib/quote-draft"
import { useQuoteDraftStore } from "@/store/quote-draft-store"

/** Espera depois da última alteração para gravar (digitar não grava a cada tecla). */
const AUTOSAVE_DELAY_MS = 400

/**
 * Rascunho local do construtor (Sprint 9):
 * 1. ao montar, lê o localStorage; havendo um orçamento não salvo (de até 30
 *    dias), devolve `pendingDraft` para o aviso "Recuperar / Descartar";
 * 2. decidido (ou sem rascunho), grava automaticamente uma cópia do formulário
 *    a cada alteração (com espera curta, e na hora ao sair da página);
 *    enquanto a pessoa não decide, NÃO grava, para não apagar o rascunho antigo.
 *
 * @param {{ form: object, userId: string, today: string,
 *   clients: Array<{ id: string }>, services: Array<{ id: string }> }} options
 * @returns {{ pendingDraft: { values: object, savedAt: string } | null,
 *   restore: () => void, discard: () => void, forget: () => void, autosaving: boolean }}
 */
export function useQuoteDraft({ form, userId, today, clients, services }) {
  // "checking": lendo o localStorage · "pending": há rascunho e a pessoa ainda
  // não escolheu · "ready": gravando automaticamente.
  const [status, setStatus] = useState("checking")
  const [pendingDraft, setPendingDraft] = useState(null)
  // Orçamento já salvo na conta: nenhuma gravação pendente pode recriar a cópia.
  const forgottenRef = useRef(false)

  // O store não hidrata sozinho (skipHydration): o servidor não tem
  // localStorage, e o 1º render do navegador precisa bater com o HTML dele.
  useEffect(() => {
    const unsubscribe = useQuoteDraftStore.persist.onFinishHydration((state) => {
      const draft = state.drafts[userId]
      if (draft && !isDraftExpired(draft.savedAt)) {
        setPendingDraft(draft)
        setStatus("pending")
        return
      }
      if (draft) state.removeDraft(userId)
      setStatus("ready")
    })
    useQuoteDraftStore.persist.rehydrate()
    return unsubscribe
  }, [userId])

  useEffect(() => {
    if (status !== "ready") return
    let timer = null
    let latest = null

    function flush() {
      clearTimeout(timer)
      timer = null
      if (!latest || forgottenRef.current) return
      const values = latest
      latest = null
      const store = useQuoteDraftStore.getState()
      // Cópia: o RHF continua mexendo no objeto de valores depois daqui.
      if (hasDraftContent(values, { today })) store.saveDraft(userId, structuredClone(values))
      else store.removeDraft(userId)
    }
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") flush()
    }

    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        latest = values
        clearTimeout(timer)
        timer = setTimeout(flush, AUTOSAVE_DELAY_MS)
      },
    })
    // Fechar a aba ou trocar de app no celular: grava sem esperar.
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", flushWhenHidden)
    return () => {
      unsubscribe()
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", flushWhenHidden)
      flush() // saindo da página pelo menu: grava o que faltava
    }
  }, [form, status, today, userId])

  // Depois de decidir, os botões do aviso somem: o foco vai para o 1º campo.
  const focusFirstField = useRef(false)
  useLayoutEffect(() => {
    if (status !== "ready" || !focusFirstField.current) return
    focusFirstField.current = false
    document.getElementById("client_id")?.focus()
  }, [status])

  function restore() {
    const values = sanitizeDraftValues(pendingDraft.values, {
      today,
      clientIds: new Set(clients.map((client) => client.id)),
      serviceIds: new Set(services.map((service) => service.id)),
    })
    // keepDefaultValues: o "vazio" continua sendo o orçamento em branco.
    form.reset(values, { keepDefaultValues: true })
    // Validade que ficou no passado enquanto o rascunho esperava: avisa já.
    if (values.valid_until < today) form.trigger("valid_until")
    toast.success("Orçamento recuperado", { description: "Continue de onde parou." })
    focusFirstField.current = true
    setPendingDraft(null)
    setStatus("ready")
  }

  function discard() {
    useQuoteDraftStore.getState().removeDraft(userId)
    focusFirstField.current = true
    setPendingDraft(null)
    setStatus("ready")
  }

  /**
   * O orçamento foi salvo na conta: apaga a cópia local e para de gravar. Chamar
   * ANTES de sair da página (ao desmontar, o construtor gravaria o que faltava).
   */
  function forget() {
    forgottenRef.current = true
    useQuoteDraftStore.getState().removeDraft(userId)
  }

  return { pendingDraft, restore, discard, forget, autosaving: status === "ready" }
}
