import { cn } from "@/lib/utils"

/**
 * Indicador do painel (stat tile): rótulo, ícone, valor em destaque e uma
 * linha de apoio. `exactValue`: o valor completo quando o exibido é compacto
 * ("R$ 1,2 mi"); vai para o title e para o leitor de tela.
 * @param {{ label: string, value: string, exactValue?: string, hint: string,
 *   icon: React.ComponentType, tone: string, className?: string }} props
 *   `tone`: classes do selo do ícone (escritas por extenso por quem chama).
 */
export function KpiTile({ label, value, exactValue, hint, icon: Icon, tone, className }) {
  const compact = exactValue && exactValue !== value
  return (
    <div className={cn("flex flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        <span
          aria-hidden="true"
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", tone)}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p
        className="mt-4 truncate font-display text-3xl leading-none tracking-tight sm:text-4xl"
        title={compact ? exactValue : undefined}
      >
        {compact ? (
          <>
            <span aria-hidden="true">{value}</span>
            <span className="sr-only">{exactValue}</span>
          </>
        ) : (
          value
        )}
      </p>
      <p className="mt-2 text-xs text-pretty text-muted-foreground">{hint}</p>
    </div>
  )
}
