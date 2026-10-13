import { notFound } from "next/navigation"

import { LogoWordmark } from "@/components/brand/logo"
import { PublicQuoteStatus } from "@/components/public-quote/public-quote-status"
import { RegisterQuoteView } from "@/components/public-quote/register-quote-view"
import { QuotePreview } from "@/components/quotes/quote-preview"
import { getPublicQuote } from "@/lib/data/public-quotes"
import { todayIso } from "@/lib/dates"
import { initials } from "@/lib/initials"
import { publicQuoteState } from "@/lib/public-quote"

// Proposta não é conteúdo para buscadores: o link é privado de quem o recebeu.
const ROBOTS = { index: false, follow: false }

export async function generateMetadata({ params }) {
  const { publicId } = await params
  const data = await getPublicQuote(publicId)
  if (!data) return { title: "Proposta não encontrada", robots: ROBOTS }
  return {
    title: { absolute: `Proposta Nº ${data.quote.quote_number} · ${data.issuer.name}` },
    description: data.quote.title,
    robots: ROBOTS,
  }
}

/**
 * Página pública da proposta (Sprint 14): o cliente abre o link sem conta. Os
 * dados vêm de uma função do banco que só devolve o necessário; rascunho e id
 * inexistente → "não encontrada"; cancelada → só o aviso, sem o documento.
 */
export default async function PublicQuotePage({ params }) {
  const { publicId } = await params
  const data = await getPublicQuote(publicId)
  if (!data) notFound()

  const { quote, client, issuer } = data
  const today = todayIso()
  const state = publicQuoteState(quote, today)

  return (
    <div className="flex min-h-svh flex-col bg-muted/50 dark:bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold tracking-wide text-primary-foreground"
          >
            {initials(issuer.name)}
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="truncate font-medium">{issuer.name}</p>
            <p className="truncate text-xs text-muted-foreground">Proposta Nº {quote.quote_number}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-3 py-6 sm:px-6 sm:py-10">
        <PublicQuoteStatus state={state} quote={quote} client={client} issuer={issuer} today={today} />
        {state !== "cancelled" && (
          <QuotePreview
            quote={quote}
            client={client}
            issuer={issuer}
            label={state === "expired" ? "Expirada" : undefined}
          />
        )}
      </main>

      <footer className="flex items-center justify-center gap-1.5 px-4 py-6 text-xs text-muted-foreground">
        Proposta enviada com <LogoWordmark className="text-xs" />
      </footer>

      {quote.status === "sent" && <RegisterQuoteView publicId={publicId} />}
    </div>
  )
}
