import Link from "next/link"
import { notFound } from "next/navigation"
import { LockIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { DuplicateQuoteButton } from "@/components/quotes/duplicate-quote-button"
import { QuoteForm } from "@/components/quotes/quote-form"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth/server"
import { listClientOptions } from "@/lib/data/clients"
import { getIssuer } from "@/lib/data/profiles"
import { getQuote } from "@/lib/data/quotes"
import { listServiceOptions } from "@/lib/data/services"
import { todayIso } from "@/lib/dates"

export async function generateMetadata({ params }) {
  const { id } = await params
  const quote = await getQuote(id)
  if (!quote) return { title: "Orçamento não encontrado" }
  return { title: quote.status === "draft" ? `Editar orçamento ${quote.quote_number}` : `Orçamento ${quote.quote_number}` }
}

/**
 * Orçamento que já saiu do rascunho: o documento que o cliente recebeu não
 * muda (regra 6 do plano; o banco também recusa). Versões novas ficam para
 * o Sprint 13.
 */
function NotEditable({ quote }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border"
      >
        <LockIcon className="size-5" />
      </span>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">Este orçamento não pode mais ser editado</h2>
          <StatusBadge status={quote.status} size="sm" />
        </div>
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">
          Só rascunhos podem ser alterados. Depois do envio, o documento que o cliente recebeu fica preservado
          exatamente como foi enviado. Para fazer uma versão corrigida, duplique-o como um novo rascunho.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <DuplicateQuoteButton quote={{ id: quote.id, quote_number: quote.quote_number }} />
        <Button asChild variant="outline">
          <Link href={`/quotes/${quote.id}`}>Ver o orçamento</Link>
        </Button>
      </div>
    </section>
  )
}

export default async function EditQuotePage({ params }) {
  const { id } = await params
  const [user, quote, clients, services, issuer] = await Promise.all([
    requireUser(),
    getQuote(id),
    listClientOptions(),
    listServiceOptions(),
    getIssuer(),
  ])
  if (!quote) notFound()

  const title = `Orçamento ${quote.quote_number}`

  if (quote.status !== "draft") {
    return (
      <>
        <PageHeader eyebrow="Orçamentos" title={title} description={quote.title} />
        <NotEditable quote={quote} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Editar rascunho"
        title={title}
        description="Altere o que precisar. O total é atualizado enquanto você edita."
      />
      <QuoteForm
        today={todayIso()}
        userId={user.id}
        clients={clients}
        services={services}
        issuer={issuer}
        quote={quote}
      />
    </>
  )
}
