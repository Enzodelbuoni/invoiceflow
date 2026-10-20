"use client"

import { FileWarningIcon } from "lucide-react"

import { LogoWordmark } from "@/components/brand/logo"
import { ErrorDigest, RetryButton, useReportError } from "@/components/shared/error-fallback"

// Erro inesperado na página da proposta (ou nas confirmações): quem vê é o
// cliente de quem enviou, então nada de links para o app; o mesmo visual da
// "Proposta não encontrada".
export default function PublicQuoteError({ error, retry }) {
  useReportError(error)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/50 px-4 text-center dark:bg-background">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-card text-destructive shadow-sm ring-1 ring-border"
      >
        <FileWarningIcon className="size-6" />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-display text-3xl">Não foi possível abrir a proposta</h1>
        <p className="text-pretty text-muted-foreground">
          Pode ser uma instabilidade momentânea. Tente de novo em alguns segundos; se continuar, fale com quem enviou a
          proposta.
        </p>
      </div>
      <RetryButton retry={retry} />
      <ErrorDigest error={error} />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Propostas enviadas com <LogoWordmark className="text-xs" />
      </p>
    </div>
  )
}
