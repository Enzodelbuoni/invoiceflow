import { cn } from "@/lib/utils"

/**
 * Cabeçalho padrão das páginas da área privada.
 * @param {{
 *   eyebrow?: string,
 *   title: string,
 *   description?: string,
 *   actions?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && (
          <p className="text-xs font-medium tracking-[0.14em] text-primary-ink uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl leading-[1.05] tracking-[-0.01em] text-balance sm:text-[2.75rem]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
