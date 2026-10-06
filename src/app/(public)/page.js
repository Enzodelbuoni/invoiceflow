import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { LogoMark, LogoWordmark } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

// Página inicial provisória. A landing page completa vem em uma etapa posterior.
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex max-w-xl animate-enter flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <LogoWordmark />
        </div>
        <h1 className="font-display text-5xl leading-[1.05] tracking-[-0.01em] text-balance sm:text-6xl">
          Propostas que <em className="text-primary-ink">fecham</em> negócio.
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          Orçamentos profissionais para freelancers, com cálculo automático, link público e aprovação online.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg" className="h-10 px-4">
            <Link href="/signup">
              Criar conta grátis
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-10 px-4">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
