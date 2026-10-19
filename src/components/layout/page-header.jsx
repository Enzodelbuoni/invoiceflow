import { cn } from "@/lib/utils"

/**
 * Cabeçalho padrão das páginas da área privada. Título e ações ficam lado a
 * lado quando cabem; quando não (celular, ou a sidebar aberta numa tela
 * média), as ações descem para a linha de baixo em vez de espremer o título.
 * Depende da largura real do cabeçalho, não da tela (flex-wrap + base do título).
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
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-5", className)}>
      <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-2">
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
