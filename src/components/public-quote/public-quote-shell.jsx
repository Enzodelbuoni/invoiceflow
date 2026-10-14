import Link from "next/link"
import { ArrowLeftIcon, EyeIcon } from "lucide-react"

import { LogoWordmark } from "@/components/brand/logo"
import { initials } from "@/lib/initials"

/**
 * Aviso para o dono logado que abriu o link da própria proposta: ele vê o que
 * o cliente vê, mas não pode responder no lugar dele.
 */
function OwnerNotice() {
  return (
    <div className="border-b border-primary/15 bg-primary/8 text-primary-ink print:hidden dark:bg-primary/12">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5 text-sm sm:px-6">
        <p className="flex items-center gap-2">
          <EyeIcon aria-hidden="true" className="size-4 shrink-0" />
          Esta é a página que o seu cliente vê. Só ele pode aprovar ou recusar a proposta.
        </p>
        <Link
          href="/quotes"
          className="flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
          Voltar ao painel
        </Link>
      </div>
    </div>
  )
}

/**
 * Moldura das páginas públicas da proposta (a proposta e as confirmações de
 * aprovação/recusa): cabeçalho com quem enviou, conteúdo e rodapé.
 * @param {{ issuer: { name: string }, quoteNumber: string, viewerIsOwner?: boolean,
 *   children: React.ReactNode, mainClassName?: string }} props
 */
export function PublicQuoteShell({ issuer, quoteNumber, viewerIsOwner = false, children, mainClassName }) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/50 print:bg-transparent! dark:bg-background">
      {viewerIsOwner && <OwnerNotice />}
      <header className="border-b bg-background print:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold tracking-wide text-primary-foreground"
          >
            {initials(issuer.name)}
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="truncate font-medium">{issuer.name}</p>
            <p className="truncate text-xs text-muted-foreground">Proposta Nº {quoteNumber}</p>
          </div>
        </div>
      </header>

      <main
        className={
          mainClassName ??
          "mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-3 py-6 sm:px-6 sm:py-10 print:max-w-none print:p-0!"
        }
      >
        {children}
      </main>

      <footer className="flex items-center justify-center gap-1.5 px-4 py-6 text-xs text-muted-foreground print:hidden">
        Proposta enviada com <LogoWordmark className="text-xs" />
      </footer>
    </div>
  )
}
