import Link from "next/link"

import { StatusBadge } from "@/components/shared/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatIsoDateShort } from "@/lib/dates"
import { formatShortDate } from "@/lib/format"
import { formatCurrency } from "@/lib/money"
import { validityHint } from "@/lib/quote-list"
import { cn } from "@/lib/utils"

// Resultados da lista de orçamentos (Sprint 19). A troca tabela ↔ cartões é
// por container query (largura da própria lista, que muda com a sidebar), não
// pela largura da tela.

const HINT_TONES = { danger: "text-destructive", warning: "text-warning", muted: "text-muted-foreground" }

/** Data que a lista usa (período e "mais recentes"): o envio ou, se nunca foi enviado, a criação. */
function referenceDate(quote) {
  return quote.sent_at ? { verb: "enviado", date: quote.sent_at } : { verb: "criado", date: quote.created_at }
}

/** Título do orçamento: link para o documento que cobre a linha/cartão inteiro. */
function QuoteTitle({ quote }) {
  return (
    <Link
      href={`/quotes/${quote.id}`}
      className="truncate font-medium outline-none after:absolute after:inset-0 after:rounded-[inherit] hover:underline focus-visible:underline"
    >
      {quote.title}
    </Link>
  )
}

function QuoteNumber({ quote }) {
  return <span className="font-mono text-xs text-muted-foreground">Nº {quote.quote_number}</span>
}

function ClientName({ client }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate">{client.name}</span>
      {client.company && <span className="truncate text-xs text-muted-foreground">{client.company}</span>}
    </div>
  )
}

/** "vence amanhã" / "venceu há 3 dias", na cor do quanto falta. */
function ValidityHint({ quote, today, className }) {
  const hint = validityHint(quote, today)
  if (!hint) return null
  return <span className={cn("text-xs", HINT_TONES[hint.tone], className)}>{hint.text}</span>
}

function QuotesTable({ quotes, today }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm @2xl:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Orçamento</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden @4xl:table-cell">Data</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead className="pr-5 text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => {
            const reference = referenceDate(quote)
            return (
              <TableRow key={quote.id} className="relative">
                <TableCell className="max-w-80 py-3 pl-5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <QuoteTitle quote={quote} />
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <QuoteNumber quote={quote} />
                      {/* Sem a coluna "Data" (lista mais estreita), a data vem aqui. */}
                      <span className="truncate text-xs text-muted-foreground @4xl:hidden">
                        · {reference.verb} em {formatShortDate(reference.date)}
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-56 text-sm">
                  <ClientName client={quote.client} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={quote.status} size="sm" />
                </TableCell>
                <TableCell className="hidden text-sm @4xl:table-cell">
                  <div className="flex flex-col">
                    <span>{formatShortDate(reference.date)}</span>
                    <span className="text-xs text-muted-foreground">{reference.verb}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">{formatIsoDateShort(quote.valid_until)}</span>
                    <ValidityHint quote={quote} today={today} />
                  </div>
                </TableCell>
                <TableCell className="pr-5 text-right font-medium tabular-nums">{formatCurrency(quote.total_cents)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// Lista estreita (celular, ou sidebar aberta numa tela média): cartões.
function QuotesCards({ quotes, today }) {
  return (
    <ul className="flex flex-col gap-3 @2xl:hidden">
      {quotes.map((quote) => {
        const reference = referenceDate(quote)
        return (
          <li key={quote.id} className="relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <QuoteTitle quote={quote} />
                <QuoteNumber quote={quote} />
              </div>
              <StatusBadge status={quote.status} size="sm" className="shrink-0" />
            </div>
            <div className="flex items-end justify-between gap-3 text-sm">
              <div className="flex min-w-0 flex-col gap-0.5">
                <ClientName client={quote.client} />
                <span className="text-xs text-muted-foreground">
                  {reference.verb === "enviado" ? "Enviado" : "Criado"} em {formatShortDate(reference.date)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Válido até {formatIsoDateShort(quote.valid_until)}
                  <ValidityHint quote={quote} today={today} className="before:content-['_·_']" />
                </span>
              </div>
              <span className="shrink-0 font-display text-xl leading-none tabular-nums">
                {formatCurrency(quote.total_cents)}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Orçamentos da página atual: tabela quando a lista é larga, cartões quando é
 * estreita. O título de cada um é um link que cobre a linha/cartão inteiro.
 * @param {{ quotes: Array<object>, today: string }} props `today`: "AAAA-MM-DD" (SP), para "vence em…".
 */
export function QuoteListResults({ quotes, today }) {
  return (
    <div className="@container">
      <QuotesTable quotes={quotes} today={today} />
      <QuotesCards quotes={quotes} today={today} />
    </div>
  )
}
