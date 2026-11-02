import { Hero } from "@/components/landing/hero"
import { HowItWorks } from "@/components/landing/how-it-works"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHeader } from "@/components/landing/landing-header"
import { sampleQuote } from "@/components/landing/sample-quote"

// Página estática, refeita uma vez por dia: as datas da proposta de exemplo
// (enviada hoje, válida por 15 dias) acompanham.
export const revalidate = 86400

/** Página inicial (etapa 42): apresentação do InvoiceFlow, benefícios e chamadas para criar conta. */
export default function Home() {
  const quote = sampleQuote()

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <LandingHeader />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        <Hero quote={quote} />
        <HowItWorks quote={quote} />
      </main>
      <LandingFooter />
    </>
  )
}
