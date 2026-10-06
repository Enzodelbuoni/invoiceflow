import Link from "next/link"
import { FlaskConicalIcon } from "lucide-react"

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel"
import { LogoMark, LogoWordmark } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { AUTH_DEMO_MODE } from "@/lib/auth/client"

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <AuthBrandPanel />

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          {/* No desktop o logo já aparece no painel da marca. */}
          <Link href="/" className="flex items-center gap-2.5 rounded-lg lg:invisible" aria-label="InvoiceFlow, página inicial">
            <LogoMark />
            <LogoWordmark />
          </Link>
          <ThemeToggle />
        </header>

        <main id="conteudo" className="flex flex-1 items-center justify-center px-6 pt-4 pb-16 sm:px-10">
          <div className="w-full max-w-sm">
            {AUTH_DEMO_MODE && (
              <p className="mb-8 flex w-fit items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                <FlaskConicalIcon aria-hidden="true" className="size-3.5" />
                Modo demonstração: nenhum dado é enviado
              </p>
            )}
            {children}
          </div>
        </main>

        <footer className="px-6 py-5 text-center text-xs text-muted-foreground sm:px-10">
          InvoiceFlow · Propostas profissionais para freelancers
        </footer>
      </div>
    </div>
  )
}
