import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { QuoteActions } from "@/components/quotes/quote-actions"
import { QuotePreview } from "@/components/quotes/quote-preview"
import { QuoteTimeline } from "@/components/quotes/quote-timeline"
import { StatusBadge } from "@/components/shared/status-badge"
import { QUOTE_STATUS_DESCRIPTIONS } from "@/lib/constants/quote-status"
import { getQuoteDocument, listQuoteEvents } from "@/lib/data/quotes"
import { todayIso } from "@/lib/dates"

export async function generateMetadata({ params }) {
  const { id } = await params
  const document = await getQuoteDocument(id)
  return { title: document ? `Orçamento ${document.quote.quote_number}` : "Orçamento não encontrado" }
}

// Selo no documento quando ele não é (ou não é mais) a proposta em vigor.
const DOCUMENT_LABELS = Object.freeze({ draft: "Rascunho", cancelled: "Cancelada", expired: "Expirada" })

/** Visualização interna do orçamento: o documento como o cliente vai receber + histórico. */
export default async function QuotePage({ params }) {
  const { id } = await params
  const [document, events] = await Promise.all([getQuoteDocument(id), listQuoteEvents(id)])
  if (!document) notFound()

  const { quote, client, issuer } = document

  return (
    <>
      <PageHeader
        eyebrow="Orçamentos"
        title={`Orçamento ${quote.quote_number}`}
        description={QUOTE_STATUS_DESCRIPTIONS[quote.status]}
        actions={
          <>
            <StatusBadge status={quote.status} className="mr-1" />
            <QuoteActions quote={quote} clientName={client?.name ?? null} today={todayIso()} />
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        {/* A "mesa" onde o documento fica: destaca o papel nos dois temas. */}
        <div className="rounded-2xl border bg-muted/50 px-2 py-4 sm:p-8 dark:bg-muted/30">
          <QuotePreview quote={quote} client={client} issuer={issuer} label={DOCUMENT_LABELS[quote.status]} />
        </div>
        <QuoteTimeline events={events} className="xl:sticky xl:top-20" />
      </div>
    </>
  )
}
