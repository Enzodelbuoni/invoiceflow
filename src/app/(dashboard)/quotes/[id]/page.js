import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { QuoteActions } from "@/components/quotes/quote-actions"
import { QuotePreview } from "@/components/quotes/quote-preview"
import { QuoteResponseCard } from "@/components/quotes/quote-response-card"
import { QuoteTimeline } from "@/components/quotes/quote-timeline"
import { StatusBadge } from "@/components/shared/status-badge"
import { QUOTE_STATUS_DESCRIPTIONS } from "@/lib/constants/quote-status"
import { getQuoteDocument, getQuoteResponse, listQuoteEvents } from "@/lib/data/quotes"
import { todayIso } from "@/lib/dates"
import { isPdfAvailable } from "@/lib/pdf/render"

export async function generateMetadata({ params }) {
  const { id } = await params
  const document = await getQuoteDocument(id)
  return { title: document ? `Orçamento ${document.quote.quote_number}` : "Orçamento não encontrado" }
}

// Selo no documento quando ele não é (ou não é mais) a proposta em vigor.
const DOCUMENT_LABELS = Object.freeze({
  draft: "Rascunho",
  declined: "Recusada",
  cancelled: "Cancelada",
  expired: "Expirada",
})

/**
 * Visualização interna do orçamento: o documento como o cliente vai receber,
 * a resposta do cliente (aceite ou recusa) e o histórico.
 */
export default async function QuotePage({ params }) {
  const { id } = await params
  const [document, events, response] = await Promise.all([
    getQuoteDocument(id),
    listQuoteEvents(id),
    getQuoteResponse(id),
  ])
  if (!document) notFound()

  const { quote, client, issuer } = document
  const acceptance =
    response?.decision === "approved" ? { signer_name: response.signer_name, responded_at: response.created_at } : null

  return (
    <>
      <PageHeader
        className="print:hidden"
        eyebrow="Orçamentos"
        title={`Orçamento ${quote.quote_number}`}
        description={QUOTE_STATUS_DESCRIPTIONS[quote.status]}
        actions={
          <>
            <StatusBadge status={quote.status} className="mr-1" />
            <QuoteActions
              quote={quote}
              clientName={client?.name ?? null}
              today={todayIso()}
              pdfAvailable={isPdfAvailable()}
            />
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        {/* A "mesa" onde o documento fica: destaca o papel nos dois temas. */}
        {/* Na impressão, só o documento vai para o papel (sem a mesa). */}
        <div className="rounded-2xl border bg-muted/50 px-2 py-4 sm:p-8 dark:bg-muted/30 print:border-0 print:bg-transparent! print:p-0!">
          <QuotePreview
            quote={quote}
            client={client}
            issuer={issuer}
            label={DOCUMENT_LABELS[quote.status]}
            acceptance={acceptance}
          />
        </div>
        <div className="flex flex-col gap-4 xl:sticky xl:top-20 print:hidden">
          {response && <QuoteResponseCard response={response} />}
          <QuoteTimeline events={events} />
        </div>
      </div>
    </>
  )
}
