"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { duplicateQuoteAction } from "@/actions/quotes"
import { isSessionExpired, runAction } from "@/lib/action-client"

/**
 * "Duplicar como novo rascunho": cria a cópia no servidor e abre a edição dela.
 * Não pede confirmação (nada é alterado no original); o aviso mostra o
 * andamento e o número do rascunho novo.
 * @returns {{ duplicate: (quote: { id: string, quote_number: string }) => void, pending: boolean }}
 */
export function useDuplicateQuote() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function duplicate(quote) {
    startTransition(async () => {
      const toastId = toast.loading("Duplicando orçamento…")
      const result = await runAction(() => duplicateQuoteAction(quote.id))
      if (!result.ok) {
        // Sessão expirada: o aviso com "Entrar novamente" já está na tela.
        if (isSessionExpired(result)) toast.dismiss(toastId)
        else toast.error(result.message, { id: toastId })
        return
      }
      toast.success(`Rascunho ${result.quoteNumber} criado`, {
        id: toastId,
        description: `Cópia do orçamento ${quote.quote_number}. Ajuste o que precisar.`,
      })
      router.push(`/quotes/${result.id}/edit`)
    })
  }

  return { duplicate, pending }
}
