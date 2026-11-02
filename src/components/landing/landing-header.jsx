import Link from "next/link"

import { LogoMark, LogoWordmark } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"

/** Seções da página inicial no menu do topo (âncoras). */
export const LANDING_NAV = Object.freeze([
  { id: "como-funciona", label: "Como funciona" },
  { id: "recursos", label: "Recursos" },
  { id: "para-o-cliente", label: "Para o cliente" },
  { id: "perguntas", label: "Perguntas" },
])

/**
 * Cabeçalho fixo da página inicial: marca, atalhos para as seções (a partir
 * de 1024 px), tema, "Entrar" e "Criar conta". Quem já está logado e clica em
 * "Entrar" vai direto para o painel (o proxy redireciona).
 */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="InvoiceFlow, página inicial">
          <LogoMark />
          <LogoWordmark />
        </Link>

        <nav aria-label="Seções da página" className="hidden lg:block">
          <ul className="flex items-center gap-1 text-sm">
            {LANDING_NAV.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="rounded-md px-3 py-2 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="h-9 px-3 max-md:h-10">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild className="h-9 px-3.5 shadow-sm max-sm:hidden">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
