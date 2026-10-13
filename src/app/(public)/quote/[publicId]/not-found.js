import { FileXIcon } from "lucide-react"

import { LogoWordmark } from "@/components/brand/logo"

export const metadata = { robots: { index: false, follow: false } }

// Link inexistente, de rascunho ou digitado errado: a mesma resposta (não
// revela se o orçamento existe).
export default function PublicQuoteNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/50 px-4 text-center dark:bg-background">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-sm ring-1 ring-border"
      >
        <FileXIcon className="size-6" />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-display text-3xl">Proposta não encontrada</h1>
        <p className="text-pretty text-muted-foreground">
          Confira se o link está completo. Se o problema continuar, fale com quem enviou a proposta.
        </p>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Propostas enviadas com <LogoWordmark className="text-xs" />
      </p>
    </div>
  )
}
