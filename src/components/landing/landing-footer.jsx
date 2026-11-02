import Link from "next/link"

import { LANDING_NAV } from "@/components/landing/landing-header"
import { LogoMark, LogoWordmark } from "@/components/brand/logo"

const LINK_CLASS =
  "rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"

/** Rodapé da página inicial: marca, atalhos e o aviso de que os exemplos são fictícios. */
export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3">
          <Link href="/" className="flex w-fit items-center gap-2.5 rounded-lg" aria-label="InvoiceFlow, página inicial">
            <LogoMark />
            <LogoWordmark />
          </Link>
          <p className="max-w-xs text-sm text-pretty text-muted-foreground">
            Propostas e orçamentos profissionais para freelancers e pequenos estúdios.
          </p>
        </div>

        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {LANDING_NAV.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} className={LINK_CLASS}>
                  {label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/login" className={LINK_CLASS}>
                Entrar
              </Link>
            </li>
            <li>
              <Link href="/signup" className={LINK_CLASS}>
                Criar conta
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl border-t px-4 py-5 text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} InvoiceFlow · Os nomes, empresas e valores dos exemplos são fictícios.
      </p>
    </footer>
  )
}
