import {
  CheckIcon,
  CircleCheckIcon,
  FileDownIcon,
  FileTextIcon,
  HistoryIcon,
  KeyRoundIcon,
  MessageSquareTextIcon,
} from "lucide-react"

import { SAMPLE_CLIENT, SAMPLE_ISSUER, SAMPLE_SIGNER } from "@/components/landing/sample-quote"
import { SectionHeading } from "@/components/landing/section-heading"
import { buttonVariants } from "@/components/ui/button"
import { formatCurrency } from "@/lib/money"
import { cn } from "@/lib/utils"

const POINTS = [
  { title: "Sem cadastro nem senha", text: "O cliente abre o link e já vê a proposta, com a sua marca.", icon: KeyRoundIcon },
  {
    title: "Aprova ou recusa ali mesmo",
    text: "Aprovação com nome e e-mail; recusa com um motivo, se ele quiser negociar.",
    icon: MessageSquareTextIcon,
  },
  { title: "Tudo registrado", text: "Você sabe quando ele abriu e quando respondeu.", icon: HistoryIcon },
  { title: "PDF para guardar", text: "Ele baixa a proposta em PDF quando quiser.", icon: FileDownIcon },
]

/** Campo do formulário, só desenhado. */
function MockField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.6875rem] font-medium">{label}</span>
      <span className="flex h-8 items-center rounded-md border bg-background px-2.5 text-[0.6875rem]">{value}</span>
    </div>
  )
}

/** Celular com a página da proposta e o diálogo "Aprovar proposta" aberto. */
function PhoneMock({ quote }) {
  return (
    <div aria-hidden="true" inert className="relative mx-auto w-[18.5rem] shrink-0 animate-reveal">
      <div className="absolute inset-x-6 top-12 bottom-0 -z-10 rounded-[3rem] bg-primary/25 blur-3xl" />
      <div className="rounded-[2.75rem] border bg-zinc-900 p-2.5 shadow-2xl ring-1 ring-black/10 dark:bg-zinc-800">
        <div className="relative flex h-[36rem] flex-col overflow-hidden rounded-[2.25rem] bg-background">
          <span className="absolute top-2.5 left-1/2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-zinc-900 dark:bg-zinc-800" />

          {/* A página da proposta, por trás do diálogo. */}
          <div className="flex flex-col gap-3 px-4 pt-12">
            <div className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-xs">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-ink">
                <FileTextIcon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-display text-base">Proposta para {SAMPLE_CLIENT.name}</span>
                <span className="text-[0.6875rem] text-muted-foreground">{SAMPLE_ISSUER.name}</span>
              </span>
            </div>
            <div className="theme-paper overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
              <span className="block h-1 bg-primary" />
              <div className="flex flex-col gap-2 p-3">
                <span className="font-mono text-[0.625rem] text-muted-foreground">Nº {quote.quote_number}</span>
                <span className="font-display text-lg leading-tight">{quote.title}</span>
                <span className="h-1 w-full rounded-full bg-foreground/10" />
                <span className="h-1 w-2/3 rounded-full bg-foreground/10" />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-black/45" />

          {/* O diálogo, como abre no celular. */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-2xl border-t bg-card p-4 pb-5 shadow-2xl">
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-xl leading-tight">Aprovar proposta</span>
              <span className="text-[0.6875rem] text-pretty text-muted-foreground">
                Confirme seus dados para registrar o aceite.
              </span>
            </div>
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 pt-2.5 pb-2">
              <span className="block truncate font-display text-2xl leading-8 italic">{SAMPLE_SIGNER}</span>
              <span className="block h-px bg-foreground/25" />
              <span className="mt-1 block text-[0.5625rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Assinatura eletrônica
              </span>
            </div>
            <MockField label="Nome completo" value={SAMPLE_SIGNER} />
            <MockField label="E-mail" value="marina@exemplo.com" />
            <div className="flex items-start gap-2 text-[0.6875rem] leading-snug">
              <span className="mt-px flex size-3.5 shrink-0 items-center justify-center rounded-[4px] bg-primary text-primary-foreground">
                <CheckIcon className="size-2.5" strokeWidth={3} />
              </span>
              Li a proposta e aceito os itens, os valores e os termos descritos nela.
            </div>
            <span className={cn(buttonVariants(), "h-9 w-full text-xs shadow-sm")}>
              <CircleCheckIcon data-icon="inline-start" />
              Aprovar · {formatCurrency(quote.total_cents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** "Para o seu cliente": a experiência de quem recebe a proposta. */
export function ClientExperience({ quote }) {
  return (
    <section
      id="para-o-cliente"
      aria-labelledby="para-o-cliente-title"
      className="border-y bg-muted/30 py-20 sm:py-28"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
        <div className="flex flex-col gap-10">
          <SectionHeading
            id="para-o-cliente-title"
            eyebrow="Para o seu cliente"
            title={
              <>
                Uma página bonita para dizer <em className="text-primary-ink">sim</em>.
              </>
            }
            align="start"
          >
            O cliente recebe o link, vê a proposta com a sua marca e responde ali mesmo, do celular ou do computador.
          </SectionHeading>

          <ul className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            {POINTS.map(({ title, text, icon: Icon }) => (
              <li key={title} className="flex gap-3.5">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-primary-ink shadow-xs"
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{title}</span>
                  <span className="text-sm text-pretty text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <PhoneMock quote={quote} />
      </div>
    </section>
  )
}
