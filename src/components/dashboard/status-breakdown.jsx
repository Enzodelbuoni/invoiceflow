import { StatusBadge } from "@/components/shared/status-badge"
import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-status"
import { countLabel } from "@/lib/dashboard"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

// Cor de cada barra (por extenso para o Tailwind gerá-las). A identidade vem
// do selo com ícone e nome ao lado: a cor só reforça.
const BAR_CLASSES = {
  draft: "bg-status-draft",
  sent: "bg-status-sent",
  viewed: "bg-status-viewed",
  approved: "bg-status-approved",
  declined: "bg-status-declined",
  expired: "bg-status-expired",
  cancelled: "bg-status-cancelled",
}

/**
 * Propostas por situação no período: selo do status, barra com a parte do
 * total e o número (com o percentual). É uma lista legível sem as barras.
 * @param {{ byStatus: Record<string, number>, total: number, periodText: string, className?: string }} props
 */
export function StatusBreakdown({ byStatus, total, periodText, className }) {
  return (
    <section
      aria-labelledby="status-breakdown-title"
      className={cn("flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="status-breakdown-title" className="font-medium">
          Propostas por situação
        </h2>
        <p className="text-sm text-muted-foreground">
          {countLabel(total, "proposta", "propostas")} {periodText}
        </p>
      </div>

      <ul className="flex flex-col gap-3.5">
        {QUOTE_STATUS_VALUES.map((status) => {
          const count = byStatus[status] ?? 0
          const share = total > 0 ? count / total : 0
          return (
            <li key={status} className="grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto]">
              <StatusBadge status={status} size="sm" className="justify-self-start" />
              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700 ease-out-expo", BAR_CLASSES[status])}
                  style={{ width: `${count > 0 ? Math.max(share * 100, 2) : 0}%` }}
                />
              </div>
              <p className="min-w-16 text-right text-sm tabular-nums">
                <span className="font-medium">{count.toLocaleString("pt-BR")}</span>
                <span className="text-muted-foreground"> · {formatPercent(share)}</span>
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
