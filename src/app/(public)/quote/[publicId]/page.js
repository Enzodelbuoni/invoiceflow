import { notFound } from "next/navigation"

import { PublicQuoteShell } from "@/components/public-quote/public-quote-shell"
import { PublicQuoteStatus } from "@/components/public-quote/public-quote-status"
import { QuoteResponseActions } from "@/components/public-quote/quote-response-actions"
import { RegisterQuoteView } from "@/components/public-quote/register-quote-view"
import { QuotePreview } from "@/components/quotes/quote-preview"
import { PrintButton } from "@/components/shared/print-button"
import { getPublicQuote } from "@/lib/data/public-quotes"
import { todayIso } from "@/lib/dates"
import { publicQuoteState } from "@/lib/public-quote"

// Proposta não é conteúdo para buscadores: o link é privado de quem o recebeu.
const ROBOTS = { index: false, follow: false }

// Selo no documento quando ele não é mais a proposta em aberto.
const DOCUMENT_LABELS = Object.freeze({ declined: "Recusada", expired: "Expirada" })

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

/** Fechamento depois do documento: quem leu até o fim responde ali mesmo. */
function RespondSection({ children }) {
  return (
    <section
      aria-labelledby="public-quote-respond-title"
      className="mx-auto flex w-full max-w-[52rem] flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6 print:hidden"
    >
      <div className="flex flex-col gap-1">
        <h2 id="public-quote-respond-title" className="font-display text-2xl leading-tight">
          Tudo certo com a proposta?
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          Aprove para registrar o seu aceite eletrônico, ou recuse e, se quiser, conte o motivo.
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </section>
  )
}

/**
 * Página pública da proposta (Sprints 14 e 15): o cliente abre o link sem conta,
 * lê o documento e aprova (aceite eletrônico) ou recusa. Os dados vêm de uma
 * função do banco que só devolve o necessário; rascunho e id inexistente →
 * "não encontrada"; cancelada → só o aviso, sem o documento.
 */
export default async function PublicQuotePage({ params }) {
  const { publicId } = await params
  const data = await getPublicQuote(publicId)
  if (!data) notFound()

  const { quote, client, issuer, response, viewer_is_owner: viewerIsOwner } = data
  const today = todayIso()
  const state = publicQuoteState(quote, today)
  const acceptance =
    response?.decision === "approved"
      ? { signer_name: response.signer_name, responded_at: response.responded_at }
      : null

  // Só o resumo vai para os diálogos (componentes de cliente), não a proposta inteira.
  const actions =
    state === "open" ? (
      <QuoteResponseActions
        publicId={publicId}
        quote={{
          quote_number: quote.quote_number,
          title: quote.title,
          total_cents: quote.total_cents,
          has_terms: Boolean(quote.terms),
        }}
        clientEmail={client?.email ?? null}
        issuerName={issuer.name}
        disabled={viewerIsOwner}
      />
    ) : null

  return (
    <PublicQuoteShell issuer={issuer} quoteNumber={quote.quote_number} viewerIsOwner={viewerIsOwner}>
      <PublicQuoteStatus
        state={state}
        quote={quote}
        client={client}
        issuer={issuer}
        response={response}
        today={today}
      >
        {actions}
      </PublicQuoteStatus>
      {state !== "cancelled" && (
        <div className="mx-auto -mb-2 flex w-full max-w-[52rem] justify-end print:hidden">
          <PrintButton />
        </div>
      )}
      {state !== "cancelled" && (
        <QuotePreview
          quote={quote}
          client={client}
          issuer={issuer}
          label={DOCUMENT_LABELS[state]}
          acceptance={acceptance}
        />
      )}
      {actions && <RespondSection>{actions}</RespondSection>}

      {quote.status === "sent" && <RegisterQuoteView publicId={publicId} />}
    </PublicQuoteShell>
  )
}
