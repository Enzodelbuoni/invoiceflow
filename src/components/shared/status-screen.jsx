import Link from "next/link"

import { LogoMark, LogoWordmark } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { cn } from "@/lib/utils"

const TONES = {
  default: { glow: "bg-primary/15", icon: "text-primary-ink", tint: "from-primary/10" },
  // No claro, o vermelho com desfoque pesa mais: brilho mais fraco.
  danger: { glow: "bg-destructive/7 dark:bg-destructive/12", icon: "text-destructive", tint: "from-destructive/10" },
}

/**
 * Tela inteira fora do painel (404 geral, erro geral, erro do layout raiz):
 * logo, número grande ("404") ou ícone, título serif, descrição e ações.
 * @param {{
 *   code?: string,
 *   icon?: React.ComponentType<{ className?: string }>,
 *   tone?: "default" | "danger",
 *   title: string,
 *   description: string,
 *   footer?: React.ReactNode,
 *   standalone?: boolean,
 *   children?: React.ReactNode,
 * }} props `children`: botões de ação. `standalone`: sem os providers do app
 *   (global-error.js): sem o seletor de tema e com links comuns (recarregam a página).
 */
export function StatusScreen({ code, icon: Icon, tone = "default", title, description, footer, standalone = false, children }) {
  const colors = TONES[tone] ?? TONES.default
  const HomeLink = standalone ? "a" : Link

  return (
    <div className="relative isolate flex min-h-svh flex-1 flex-col overflow-hidden">
      {/* Grade que some nas bordas + brilho atrás do conteúdo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_60%_55%_at_50%_42%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute top-[42%] left-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl", colors.glow)}
      />

      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <HomeLink href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="InvoiceFlow, página inicial">
          <LogoMark />
          <LogoWordmark />
        </HomeLink>
        {!standalone && <ThemeToggle />}
      </header>

      <main id="conteudo" className="flex flex-1 items-center justify-center px-6 pt-4 pb-20 sm:px-10">
        <div className="flex max-w-lg animate-enter flex-col items-center text-center">
          {code ? (
            <p
              aria-hidden="true"
              className="bg-linear-to-b from-foreground/80 to-foreground/10 bg-clip-text font-display text-[7.5rem] leading-[0.9] tracking-[-0.02em] text-transparent sm:text-[10rem]"
            >
              {code}
            </p>
          ) : (
            Icon && (
              <span
                aria-hidden="true"
                className={cn(
                  "relative flex size-16 items-center justify-center rounded-2xl border bg-card shadow-lg ring-4 ring-background",
                  colors.icon,
                )}
              >
                <span className={cn("absolute inset-0 rounded-2xl bg-linear-to-b to-transparent", colors.tint)} />
                <Icon className="relative size-7" strokeWidth={1.75} />
              </span>
            )
          )}

          <h1 className="mt-6 font-display text-4xl leading-tight tracking-[-0.01em] text-balance sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-md text-pretty text-muted-foreground sm:text-lg">{description}</p>
          {children && <div className="mt-8 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">{children}</div>}
          {footer && <div className="mt-8">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
