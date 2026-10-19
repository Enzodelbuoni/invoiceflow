import { QuoteEventIcon } from "@/components/quotes/quote-event-icon"
import { formatMomentRelative } from "@/lib/dates"
import { quoteEventLabel, summarizeQuoteEvents } from "@/lib/quote-events"
import { cn } from "@/lib/utils"

/**
 * Histórico do orçamento (eventos gravados pelo banco), do mais novo ao mais
 * antigo; salvamentos seguidos aparecem juntos ("Alterações salvas · 3 vezes").
 * @param {{ events: Array<{ id: string, type: string, created_at: string }>, className?: string }} props
 */
export function QuoteTimeline({ events, className }) {
  const items = summarizeQuoteEvents(events)
  return (
    <section aria-labelledby="quote-timeline-title" className={cn("rounded-2xl border bg-card p-5 shadow-sm", className)}>
      <h2 id="quote-timeline-title" className="text-sm font-semibold">
        Histórico
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum evento ainda.</p>
      ) : (
        <ol className="mt-4 flex flex-col">
          {items.map((item, index) => {
            const last = index === items.length - 1
            return (
              <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                {/* Fio que liga os eventos. */}
                {!last && <span aria-hidden="true" className="absolute top-8 bottom-1 left-[0.9375rem] w-px bg-border" />}
                <QuoteEventIcon type={item.type} />
                <div className="flex min-w-0 flex-col gap-0.5 pt-1">
                  <p className="text-sm font-medium">
                    {quoteEventLabel(item)}
                    {item.count > 1 && <span className="font-normal text-muted-foreground"> · {item.count} vezes</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={item.created_at}>{formatMomentRelative(item.created_at)}</time>
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
