import Link from "next/link"
import { ArrowRightIcon, FileTextIcon, PlusIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { QUOTE_STATUS_DESCRIPTIONS } from "@/lib/constants/quote-status"
import { listQuotes } from "@/lib/data/quotes"
import { formatIsoDateShort } from "@/lib/dates"
import { formatCurrency } from "@/lib/money"

export const metadata = { title: "Orçamentos" }

const DESCRIPTION = "Crie, envie e acompanhe suas propostas comerciais."

function NewQuoteButton({ size = "lg" }) {
  return (
    <Button asChild size={size} className="h-10 px-4">
      <Link href="/quotes/new">
        <PlusIcon data-icon="inline-start" />
        Novo orçamento
      </Link>
    </Button>
  )
}

function Arrow() {
  return <ArrowRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/60" />
}

// Explica o fluxo de status (Sprint 12) enquanto a lista ainda está vazia.
function StatusLifecycle() {
  return (
    <section aria-labelledby="ciclo-titulo" className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 id="ciclo-titulo" className="text-sm font-semibold">
        Como funciona o ciclo de um orçamento
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada proposta passa por estas etapas, e você acompanha tudo em tempo real.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <StatusBadge status="draft" />
        <Arrow />
        <StatusBadge status="sent" />
        <Arrow />
        <StatusBadge status="viewed" />
        <Arrow />
        <span className="flex items-center gap-1.5">
          <StatusBadge status="approved" />
          <span className="text-xs text-muted-foreground">ou</span>
          <StatusBadge status="declined" />
        </span>
      </div>
      <dl className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2.5">
          <dt className="shrink-0">
            <StatusBadge status="expired" size="sm" />
          </dt>
          <dd className="text-muted-foreground">{QUOTE_STATUS_DESCRIPTIONS.expired}</dd>
        </div>
        <div className="flex items-start gap-2.5">
          <dt className="shrink-0">
            <StatusBadge status="cancelled" size="sm" />
          </dt>
          <dd className="text-muted-foreground">{QUOTE_STATUS_DESCRIPTIONS.cancelled}</dd>
        </div>
      </dl>
    </section>
  )
}

function QuoteNumber({ quote }) {
  return <span className="font-mono text-xs text-muted-foreground">Nº {quote.quote_number}</span>
}

/** Cliente do orçamento; `client` vem do join e pode faltar se a leitura dele falhar no RLS. */
function ClientName({ client }) {
  if (!client) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate">{client.name}</span>
      {client.company && <span className="truncate text-xs text-muted-foreground">{client.company}</span>}
    </div>
  )
}

function QuotesTable({ quotes }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Orçamento</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead className="pr-5 text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="max-w-80 py-3 pl-5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{quote.title}</span>
                  <QuoteNumber quote={quote} />
                </div>
              </TableCell>
              <TableCell className="max-w-56 text-sm">
                <ClientName client={quote.client} />
              </TableCell>
              <TableCell>
                <StatusBadge status={quote.status} size="sm" />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatIsoDateShort(quote.valid_until)}</TableCell>
              <TableCell className="pr-5 text-right font-medium tabular-nums">{formatCurrency(quote.total_cents)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// No celular a tabela vira uma lista de cartões.
function QuotesCards({ quotes }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {quotes.map((quote) => (
        <li key={quote.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium">{quote.title}</span>
              <QuoteNumber quote={quote} />
            </div>
            <StatusBadge status={quote.status} size="sm" className="shrink-0" />
          </div>
          <div className="flex items-end justify-between gap-3 text-sm">
            <div className="flex min-w-0 flex-col gap-0.5">
              <ClientName client={quote.client} />
              <span className="text-xs text-muted-foreground">Válido até {formatIsoDateShort(quote.valid_until)}</span>
            </div>
            <span className="shrink-0 font-display text-xl leading-none tabular-nums">
              {formatCurrency(quote.total_cents)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default async function QuotesPage() {
  const quotes = await listQuotes()

  // Nenhum orçamento ainda: estado vazio + explicação do ciclo de status.
  if (quotes.length === 0) {
    return (
      <>
        <PageHeader title="Orçamentos" description={DESCRIPTION} actions={<NewQuoteButton />} />
        <EmptyState
          icon={FileTextIcon}
          title="Nenhum orçamento ainda"
          description="Monte propostas com itens, descontos e impostos calculados automaticamente, e envie um link para o cliente aprovar."
        >
          <Button asChild>
            <Link href="/quotes/new">
              <PlusIcon data-icon="inline-start" />
              Criar primeiro orçamento
            </Link>
          </Button>
        </EmptyState>
        <StatusLifecycle />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Orçamentos" description={DESCRIPTION} actions={<NewQuoteButton />} />

      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {quotes.length} {quotes.length === 1 ? "orçamento" : "orçamentos"}
        </p>
        <QuotesTable quotes={quotes} />
        <QuotesCards quotes={quotes} />
      </div>
    </>
  )
}
