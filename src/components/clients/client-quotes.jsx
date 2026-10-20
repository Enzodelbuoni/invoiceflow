import Link from "next/link"
import { ArrowRightIcon, FileTextIcon, PlusIcon } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatShortDateCompact } from "@/lib/format"
import { formatCurrency } from "@/lib/money"
import { parseQuoteListParams, quoteListHref, validityHint } from "@/lib/quote-list"
import { cn } from "@/lib/utils"

const HINT_TONES = { danger: "text-destructive", warning: "text-warning", muted: "text-muted-foreground" }

/**
 * Orçamentos do cliente, na página dele: os mais recentes, com status, valor e
 * quando venceriam. Sem nenhum, o convite para criar o primeiro (o construtor
 * já abre com o cliente escolhido).
 * @param {{ client: { id: string, name: string }, total: number,
 *   quotes: Awaited<ReturnType<typeof import("@/lib/data/quotes").listClientQuotes>>["items"],
 *   today: string }} props `today` ("AAAA-MM-DD") vem do servidor.
 */
export function ClientQuotes({ client, total, quotes, today }) {
  const newQuoteHref = `/quotes/new?cliente=${client.id}`

  if (total === 0) {
    return (
      <EmptyState
        icon={FileTextIcon}
        title="Nenhum orçamento ainda"
        description={`Crie a primeira proposta para ${client.name}. Ela aparece aqui, com status e valores.`}
      >
        <Button asChild>
          <Link href={newQuoteHref}>
            <PlusIcon data-icon="inline-start" />
            Criar orçamento
          </Link>
        </Button>
      </EmptyState>
    )
  }

  return (
    <section aria-labelledby="orcamentos" className="@container rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="orcamentos" className="flex items-center gap-2 text-sm font-semibold">
          <FileTextIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          Orçamentos
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {total}
          </span>
        </h2>
        <Button asChild variant="outline" size="sm" className="max-md:h-10">
          <Link href={newQuoteHref}>
            <PlusIcon data-icon="inline-start" />
            Novo orçamento
          </Link>
        </Button>
      </div>

      <ul className="-mx-2 flex flex-col">
        {quotes.map((quote) => {
          const hint = validityHint(quote, today)
          const reference = quote.sent_at ? `enviado em ${formatShortDateCompact(quote.sent_at)}` : `criado em ${formatShortDateCompact(quote.created_at)}`
          return (
            <li
              key={quote.id}
              className="relative flex flex-col gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 @lg:flex-row @lg:items-center @lg:gap-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {/* Link "esticado": a linha inteira leva ao orçamento. */}
                <Link
                  href={`/quotes/${quote.id}`}
                  className="truncate text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-lg"
                >
                  {quote.title}
                </Link>
                {/* Quebra linha (em vez de reticências) para a dica de validade não sumir no celular. */}
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono whitespace-nowrap">Nº {quote.quote_number}</span> ·{" "}
                  <span className="whitespace-nowrap">{reference}</span>
                  {hint && <span className={cn("whitespace-nowrap", HINT_TONES[hint.tone])}> · {hint.text}</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-4">
                <StatusBadge status={quote.status} size="sm" />
                <span className="text-sm font-medium tabular-nums @lg:w-32 @lg:text-right">{formatCurrency(quote.total_cents)}</span>
              </div>
            </li>
          )
        })}
      </ul>

      {total > quotes.length && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t pt-4 text-sm">
          <p className="text-muted-foreground">
            Mostrando os {quotes.length} mais recentes de {total}.
          </p>
          {/* A lista não filtra por cliente: busca pelo nome (acha também outros clientes com o mesmo nome). */}
          <Link
            href={quoteListHref(parseQuoteListParams(), { query: client.name })}
            className="group -my-1.5 inline-flex items-center gap-1.5 rounded-md py-1.5 font-medium text-primary-ink outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Buscar na lista de orçamentos
            <ArrowRightIcon aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </section>
  )
}
