import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { QuoteEventIcon } from "@/components/quotes/quote-event-icon"
import { formatMomentRelative } from "@/lib/dates"
import { quoteEventLabel } from "@/lib/quote-events"
import { cn } from "@/lib/utils"

/**
 * Atividade recente do painel (Sprint 18): os últimos marcos das propostas e o
 * que o cliente fez (enviada, visualizada, aprovada, PDF baixado…), de
 * qualquer período: o seletor de período não vale aqui, e o subtítulo diz isso.
 * Cada item leva à proposta.
 * @param {{ items: ReturnType<typeof import("@/lib/quote-events").toActivityItems>, className?: string }} props
 */
export function RecentActivity({ items, className }) {
  return (
    <section
      aria-labelledby="recent-activity-title"
      className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="recent-activity-title" className="font-medium">
          Atividade recente
        </h2>
        <p className="text-sm text-muted-foreground">Os últimos acontecimentos, de qualquer período</p>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-pretty text-muted-foreground">
          Nada por aqui ainda. Quando você enviar uma proposta, o que acontecer com ela aparece aqui.
        </p>
      ) : (
        <ol className="-mx-2 flex flex-col">
          {items.map((item) => {
            const label = quoteEventLabel(item)
            return (
              <li
                key={item.id}
                className="relative flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50"
              >
                <QuoteEventIcon type={item.type} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {/* Link "esticado": o item inteiro leva à proposta. */}
                      <Link
                        href={`/quotes/${item.quote.id}`}
                        className="outline-none after:absolute after:inset-0 after:rounded-lg"
                      >
                        {label}
                        <span className="sr-only">
                          : proposta {item.quote.number}, {item.quote.title}
                          {item.quote.clientName && `, ${item.quote.clientName}`}
                        </span>
                      </Link>
                    </p>
                    <time dateTime={item.created_at} className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                      {formatMomentRelative(item.created_at)}
                    </time>
                  </div>
                  <p aria-hidden="true" className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{item.quote.number}</span> · {item.quote.title}
                    {item.quote.clientName && ` · ${item.quote.clientName}`}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <Link
        href="/quotes"
        className="group mt-auto inline-flex items-center gap-1.5 self-start rounded-md text-sm font-medium text-primary-ink outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Ver todas as propostas
        <ArrowRightIcon aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  )
}
