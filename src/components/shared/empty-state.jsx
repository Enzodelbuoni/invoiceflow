import { cn } from "@/lib/utils"

// Folha de papel decorativa que flutua atrás do ícone principal.
function PaperSheet({ className }) {
  return (
    <div
      className={cn(
        "absolute flex h-16 w-14 flex-col gap-1.5 rounded-lg border bg-card p-2.5 shadow-md",
        className
      )}
    >
      <span className="h-1.5 w-2/3 rounded-full bg-muted-foreground/20" />
      <span className="h-1.5 w-full rounded-full bg-muted-foreground/10" />
      <span className="h-1.5 w-4/5 rounded-full bg-muted-foreground/10" />
    </div>
  )
}

// Cores do ícone central: a da marca (vazio, não encontrado) ou a de erro.
const TONES = {
  default: { glow: "bg-primary/25", icon: "text-primary-ink", tint: "from-primary/10" },
  danger: { glow: "bg-destructive/20", icon: "text-destructive", tint: "from-destructive/10" },
}

/**
 * Estado vazio de listas e seções: ilustração, título, descrição e ações.
 * Com `tone="danger"`, o mesmo desenho serve de estado de erro.
 * @param {{
 *   icon: React.ComponentType<{ className?: string }>,
 *   title: string,
 *   description?: string,
 *   tone?: "default" | "danger",
 *   footer?: React.ReactNode,
 *   children?: React.ReactNode,
 *   className?: string,
 * }} props `children` recebe os botões de ação; `footer`, uma linha discreta embaixo deles.
 */
export function EmptyState({ icon: Icon, title, description, tone = "default", footer, children, className }) {
  const colors = TONES[tone] ?? TONES.default
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "relative isolate flex flex-col items-center overflow-hidden rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center sm:py-16",
        className
      )}
    >
      {/* Grade de fundo que desaparece nas bordas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[28px_28px] mask-[radial-gradient(ellipse_55%_60%_at_50%_35%,black,transparent)]"
      />

      {/* Ilustração */}
      <div aria-hidden="true" className="relative mb-8 flex h-24 w-36 items-center justify-center">
        <div className={cn("absolute size-20 rounded-full blur-2xl", colors.glow)} />
        <PaperSheet className="left-1 top-3 -rotate-12 animate-float" />
        <PaperSheet className="right-1 top-3 rotate-12 animate-float-delayed" />
        <div className={cn("relative flex size-16 items-center justify-center rounded-2xl border bg-card shadow-lg ring-4 ring-background", colors.icon)}>
          <div className={cn("absolute inset-0 rounded-2xl bg-linear-to-b to-transparent", colors.tint)} />
          <Icon className="relative size-7" strokeWidth={1.75} />
        </div>
      </div>

      <h2 className="font-display text-2xl leading-tight text-balance sm:text-3xl">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm text-pretty text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
      {children && (
        <div className="mt-7 flex flex-col items-center gap-2 sm:flex-row">{children}</div>
      )}
      {footer && <div className="mt-6 text-xs text-muted-foreground">{footer}</div>}
    </div>
  )
}
