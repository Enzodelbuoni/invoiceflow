import Link from "next/link"
import { ArrowRightIcon, CheckIcon, CircleCheckIcon, EyeIcon, LockIcon } from "lucide-react"

import { SAMPLE_CLIENT, SAMPLE_ISSUER, SAMPLE_SIGNER } from "@/components/landing/sample-quote"
import { QuotePreview } from "@/components/quotes/quote-preview"
import { Button, buttonVariants } from "@/components/ui/button"
import { formatCurrency } from "@/lib/money"
import { cn } from "@/lib/utils"

const PROMISES = ["Seu cliente aprova sem criar conta", "PDF pronto para enviar", "Funciona no celular"]

/** Brilho da marca + grade que some nas bordas, atrás do título. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)] opacity-70" />
      <div className="absolute -top-56 left-1/2 h-120 w-240 max-w-[140vw] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px] dark:bg-primary/30" />
    </div>
  )
}

/** Aviso flutuante ao lado da proposta (só em telas largas, na margem da janela, sem cobrir o documento). */
function FloatingNote({ icon: Icon, tone, title, detail, className, delay, floatClass = "animate-float" }) {
  return (
    <div className={cn("absolute hidden animate-enter xl:block", className)} style={{ animationDelay: delay }}>
      <div className={cn("flex items-center gap-3 rounded-xl border bg-card/90 py-2.5 pr-4 pl-2.5 text-sm shadow-lg backdrop-blur-md", floatClass)}>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", tone)}>
          <Icon className="size-4" strokeWidth={2.25} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{detail}</span>
        </span>
      </div>
    </div>
  )
}

/** A barra que o cliente vê na página da proposta: total, "Recusar" e "Aprovar proposta". */
function ResponseBar({ total }) {
  return (
    <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-4 rounded-xl border bg-card/95 py-3 pr-3 pl-4 shadow-lg backdrop-blur sm:inset-x-8 sm:bottom-6 sm:py-3.5 sm:pl-5">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[0.6875rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">Total</span>
        <span className="font-display text-2xl leading-none whitespace-nowrap tabular-nums sm:text-3xl">
          {formatCurrency(total)}
        </span>
      </div>
      <div className="flex shrink-0 gap-2">
        <span className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4 max-sm:hidden")}>Recusar</span>
        <span className={cn(buttonVariants(), "h-10 px-4 shadow-sm")}>
          <CircleCheckIcon data-icon="inline-start" />
          Aprovar proposta
        </span>
      </div>
    </div>
  )
}

/**
 * A proposta de exemplo numa janela de navegador, como o cliente a recebe pelo
 * link. Decorativa: fora da árvore de acessibilidade e sem foco (`inert`).
 */
function ProductShot({ quote }) {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-5xl px-4 sm:mt-20 sm:px-6">
      <div className="relative animate-enter" style={{ animationDelay: "350ms" }}>
        <div
          aria-hidden="true"
          className="absolute -inset-x-4 -top-6 bottom-16 -z-10 rounded-[2.5rem] bg-linear-to-b from-primary/25 via-primary/10 to-transparent blur-2xl"
        />

        <div aria-hidden="true" inert className="overflow-hidden rounded-2xl border bg-card shadow-xl">
          <div className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
            </span>
            <span className="mx-auto flex min-w-0 items-center gap-1.5 rounded-md border bg-background px-3 py-1 font-mono text-[0.6875rem] text-muted-foreground">
              <LockIcon className="size-3 shrink-0" />
              <span className="truncate">invoiceflow / quote / k7Qx2mPa</span>
            </span>
            <span className="w-11 max-sm:hidden" />
          </div>

          <div className="relative h-120 overflow-hidden bg-muted/40 sm:h-176">
            <div className="h-full px-3 pt-5 mask-[linear-gradient(to_bottom,black_68%,transparent_94%)] sm:px-8 sm:pt-8">
              {/* Um pouco reduzido no desktop: cabem os itens e os totais, como numa captura de tela. */}
              <div className="sm:[zoom:0.8]">
                <QuotePreview quote={quote} client={SAMPLE_CLIENT} issuer={SAMPLE_ISSUER} />
              </div>
            </div>
            <ResponseBar total={quote.total_cents} />
          </div>
        </div>

        <FloatingNote
          icon={EyeIcon}
          tone="bg-status-viewed/12 text-status-viewed"
          title="Proposta visualizada"
          detail={`${SAMPLE_SIGNER.split(" ")[0]} abriu o link · há 2 min`}
          className="top-40 -left-24"
          delay="900ms"
        />
        <FloatingNote
          icon={CheckIcon}
          tone="bg-status-approved/12 text-status-approved"
          title="Proposta aprovada"
          detail={`Aceite de ${SAMPLE_SIGNER} · agora`}
          className="top-96 -right-24"
          delay="1400ms"
          floatClass="animate-float-delayed"
        />
      </div>
    </div>
  )
}

/** Abertura da página inicial: proposta de valor, chamadas e o produto em uso. */
export function Hero({ quote }) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden pb-6 sm:pb-10">
      <Backdrop />

      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-14 text-center sm:px-6 sm:pt-24">
        <p className="inline-flex animate-enter items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-status-approved" />
          Para freelancers e pequenos estúdios
        </p>
        <h1
          id="hero-title"
          className="mt-6 animate-enter font-display text-[3.25rem] leading-[1] tracking-[-0.015em] text-balance sm:text-7xl"
        >
          Propostas que <em className="text-primary-ink">fecham</em> negócio.
        </h1>
        <p
          className="mt-6 max-w-xl animate-enter text-lg text-pretty text-muted-foreground"
          style={{ animationDelay: "100ms" }}
        >
          Monte orçamentos com cálculo automático, envie por link ou WhatsApp e receba a aprovação do cliente com
          aceite eletrônico. Tudo num lugar só.
        </p>
        <div
          className="mt-8 flex w-full animate-enter flex-col gap-2 sm:w-auto sm:flex-row"
          style={{ animationDelay: "180ms" }}
        >
          <Button asChild size="lg" className="h-11 px-5 shadow-md">
            <Link href="/signup">
              Criar conta grátis
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 bg-background/60 px-5">
            <a href="#como-funciona">Ver como funciona</a>
          </Button>
        </div>
        <ul
          className="mt-7 flex animate-enter flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
          style={{ animationDelay: "260ms" }}
        >
          {PROMISES.map((text) => (
            <li key={text} className="flex items-center gap-1.5">
              <CheckIcon aria-hidden="true" className="size-4 text-status-approved" strokeWidth={2.5} />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <ProductShot quote={quote} />
    </section>
  )
}
