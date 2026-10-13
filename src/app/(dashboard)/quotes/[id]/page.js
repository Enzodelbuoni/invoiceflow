import Link from "next/link"
import { notFound } from "next/navigation"
import { PencilLineIcon, SendIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { QuotePreview } from "@/components/quotes/quote-preview"
import { ComingSoonButton } from "@/components/shared/coming-soon-button"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { QUOTE_STATUS_DESCRIPTIONS } from "@/lib/constants/quote-status"
import { getQuoteDocument } from "@/lib/data/quotes"

export async function generateMetadata({ params }) {
  const { id } = await params
  const document = await getQuoteDocument(id)
  return { title: document ? `Orçamento ${document.quote.quote_number}` : "Orçamento não encontrado" }
}

/** Visualização interna do orçamento: o documento como o cliente vai receber. */
export default async function QuotePage({ params }) {
  const { id } = await params
  const document = await getQuoteDocument(id)
  if (!document) notFound()

  const { quote, client, issuer } = document
  const isDraft = quote.status === "draft"

  return (
    <>
      <PageHeader
        eyebrow="Orçamentos"
        title={`Orçamento ${quote.quote_number}`}
        description={QUOTE_STATUS_DESCRIPTIONS[quote.status]}
        actions={
          <>
            <StatusBadge status={quote.status} className="mr-1" />
            {isDraft && (
              <>
                <Button asChild variant="outline" className="h-10">
                  <Link href={`/quotes/${quote.id}/edit`}>
                    <PencilLineIcon data-icon="inline-start" />
                    Editar
                  </Link>
                </Button>
                <ComingSoonButton className="h-10" message="O envio para o cliente chega no Sprint 12.">
                  <SendIcon data-icon="inline-start" />
                  Enviar ao cliente
                </ComingSoonButton>
              </>
            )}
          </>
        }
      />

      {/* A "mesa" onde o documento fica: destaca o papel nos dois temas. */}
      <div className="rounded-2xl border bg-muted/50 px-2 py-4 sm:p-8 dark:bg-muted/30">
        <QuotePreview quote={quote} client={client} issuer={issuer} label={isDraft ? "Rascunho" : undefined} />
      </div>
    </>
  )
}
