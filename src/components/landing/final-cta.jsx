import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Chamada final, no mesmo fundo índigo do painel da marca (telas de login). */
export function FinalCta() {
  return (
    <section aria-labelledby="chamada-final-title" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative isolate animate-reveal overflow-hidden rounded-3xl bg-[oklch(0.2_0.05_270)] px-6 py-16 text-center text-white shadow-xl sm:px-12 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -left-32 -z-10 size-120 rounded-full bg-[oklch(0.55_0.22_268)] opacity-45 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -bottom-48 -z-10 size-110 rounded-full bg-[oklch(0.6_0.2_300)] opacity-30 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,oklch(1_0_0/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.06)_1px,transparent_1px)] bg-size-[44px_44px] mask-[radial-gradient(ellipse_60%_70%_at_50%_50%,black,transparent)]"
        />

        <h2
          id="chamada-final-title"
          className="mx-auto max-w-3xl font-display text-4xl leading-[1.05] tracking-[-0.01em] text-balance sm:text-6xl"
        >
          Sua próxima proposta pode sair <em className="text-[oklch(0.82_0.11_268)]">hoje</em>.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-white/70">
          Crie a conta, cadastre um cliente e mande o primeiro link em poucos minutos.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg" className="h-11 bg-white px-5 text-[oklch(0.25_0.06_270)] shadow-md hover:bg-white/90">
            <Link href="/signup">
              Criar conta grátis
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="h-11 px-5 text-white hover:bg-white/10 hover:text-white dark:hover:bg-white/10"
          >
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
