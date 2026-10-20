"use client"

import { useEffect, useTransition } from "react"
import { RotateCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Peças das telas de erro (error.js / global-error.js). A mensagem do erro
// nunca vai para a tela: em produção, erros do servidor chegam ao navegador com
// um texto genérico (em inglês) e só o `digest`, que identifica o registro no
// log do servidor.

/** Registra o erro no console do navegador (o servidor já registra o dele). */
export function useReportError(error) {
  useEffect(() => {
    console.error(error)
  }, [error])
}

/**
 * "Tentar novamente": chama o `retry()` do Next 16 (busca a página de novo no
 * servidor e re-renderiza). Ele roda numa transição; envolvendo-o na nossa, o
 * botão mostra que está tentando até a resposta chegar.
 */
export function RetryButton({ retry, className, ...props }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => startTransition(() => retry())}
      className={cn("h-10 px-4", className)}
      {...props}
    >
      <RotateCwIcon data-icon="inline-start" className={cn(pending && "animate-spin")} />
      {pending ? "Tentando de novo…" : "Tentar novamente"}
    </Button>
  )
}

/** "Código do erro: 1234567" (o digest), para casar com o log do servidor. */
export function ErrorDigest({ error, className }) {
  if (!error?.digest) return null
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Código do erro: <span className="font-mono select-all">{error.digest}</span>
    </p>
  )
}
