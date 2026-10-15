import { PercentIcon } from "lucide-react"

import { countLabel } from "@/lib/dashboard"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Destaque do painel: a taxa de conversão (aprovadas ÷ enviadas), com um
 * medidor e a frase que explica o número. Sem propostas enviadas no período,
 * mostra "—" (não 0%) e diz o porquê.
 * @param {{ metrics: { conversion: number|null, approved: number, reached: number },
 *   periodText: string, className?: string }} props
 */
export function ConversionCard({ metrics, periodText, className }) {
  const { conversion, approved, reached } = metrics
  const hasData = conversion !== null
  // O medidor nunca some de todo: com 0%, um traço mostra onde começaria.
  const fill = hasData ? Math.max(conversion * 100, 1.5) : 0

  return (
    <section
      aria-labelledby="conversion-title"
      className={cn("relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6", className)}
    >
      {/* Brilho sutil da marca, como no topo do painel. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15"
      />
      <div className="relative flex items-start justify-between gap-3">
        <h2 id="conversion-title" className="text-sm font-medium text-muted-foreground">
          Taxa de conversão
        </h2>
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-ink ring-1 ring-primary/20 ring-inset"
        >
          <PercentIcon className="size-4" />
        </span>
      </div>

      <p className="relative mt-6 font-display text-6xl leading-none tracking-tight sm:text-7xl">
        {hasData ? formatPercent(conversion) : "—"}
      </p>

      <div className="relative mt-auto flex flex-col gap-3 pt-8">
        {/* Medidor: o trilho é um tom claro da mesma cor do preenchimento. */}
        <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-primary/12 dark:bg-primary/20">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out-expo"
            style={{ width: `${fill}%` }}
          />
        </div>
        <p className="text-sm text-pretty text-muted-foreground">
          {hasData
            ? `${countLabel(approved, "proposta aprovada", "propostas aprovadas")} de ${countLabel(reached, "enviada", "enviadas")} ${periodText}.`
            : `Nenhuma proposta enviada ${periodText}. Envie uma para acompanhar a conversão.`}
        </p>
      </div>
    </section>
  )
}
