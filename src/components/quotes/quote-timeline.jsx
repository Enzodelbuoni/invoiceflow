import {
  BanIcon,
  CircleCheckIcon,
  CircleXIcon,
  DownloadIcon,
  EyeIcon,
  FilePlusIcon,
  PencilLineIcon,
  SendIcon,
  TimerOffIcon,
} from "lucide-react"

import { formatMomentRelative } from "@/lib/dates"
import { QUOTE_EVENT_LABELS, summarizeQuoteEvents } from "@/lib/quote-events"
import { cn } from "@/lib/utils"

// Ícone e cor de cada evento (classes por extenso para o Tailwind gerá-las).
const EVENT_STYLES = {
  created: { icon: FilePlusIcon, className: "bg-muted text-muted-foreground" },
  updated: { icon: PencilLineIcon, className: "bg-muted text-muted-foreground" },
  sent: { icon: SendIcon, className: "bg-status-sent/10 text-status-sent dark:bg-status-sent/15" },
  viewed: { icon: EyeIcon, className: "bg-status-viewed/10 text-status-viewed dark:bg-status-viewed/15" },
  approved: { icon: CircleCheckIcon, className: "bg-status-approved/10 text-status-approved dark:bg-status-approved/15" },
  declined: { icon: CircleXIcon, className: "bg-status-declined/10 text-status-declined dark:bg-status-declined/15" },
  expired: { icon: TimerOffIcon, className: "bg-status-expired/10 text-status-expired dark:bg-status-expired/15" },
  cancelled: { icon: BanIcon, className: "bg-status-cancelled/10 text-status-cancelled dark:bg-status-cancelled/15" },
  downloaded: { icon: DownloadIcon, className: "bg-muted text-muted-foreground" },
}

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
            const style = EVENT_STYLES[item.type] ?? EVENT_STYLES.updated
            const Icon = style.icon
            const last = index === items.length - 1
            return (
              <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                {/* Fio que liga os eventos. */}
                {!last && <span aria-hidden="true" className="absolute top-8 bottom-1 left-[0.9375rem] w-px bg-border" />}
                <span
                  aria-hidden="true"
                  className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", style.className)}
                >
                  <Icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5 pt-1">
                  <p className="text-sm font-medium">
                    {QUOTE_EVENT_LABELS[item.type] ?? item.type}
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
