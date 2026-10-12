import { cn } from "@/lib/utils"

/**
 * Bloco numerado do construtor de orçamentos ("1 Cliente", "2 Informações"…).
 * O número guia a ordem de preenchimento; o título nomeia a seção para leitores de tela.
 */
export function QuoteSection({ id, step, title, description, children, className }) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn("rounded-2xl border bg-card shadow-sm", className)}>
      <header className="flex items-start gap-3.5 border-b px-5 py-4 sm:px-6">
        <span
          aria-hidden="true"
          className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary-ink tabular-nums ring-1 ring-primary/20 dark:bg-primary/15"
        >
          {step}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`${id}-title`} className="leading-6 font-medium">
            {title}
          </h2>
          {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
        </div>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

/**
 * Estado "ainda vazio" dentro de uma seção: ícone, texto e ações, numa caixa
 * tracejada (o mesmo idioma visual da busca sem resultados). `invalid`: a
 * seção é obrigatória e o envio a encontrou vazia (borda na cor de erro).
 */
export function QuoteSectionEmpty({ icon: Icon, title, description, invalid = false, children }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-dashed px-5 py-7 text-center transition-colors sm:flex-row sm:text-left",
        invalid && "border-destructive/60 bg-destructive/5 dark:bg-destructive/10",
      )}
    >
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex shrink-0 flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}
