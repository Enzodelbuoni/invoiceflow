import { CircleCheckIcon, EyeIcon, FileDownIcon, LinkIcon, MailIcon, MessageCircleIcon, SendIcon } from "lucide-react"

import { SAMPLE_CLIENT, SAMPLE_ISSUER, SAMPLE_SIGNER } from "@/components/landing/sample-quote"
import { SectionHeading } from "@/components/landing/section-heading"
import { formatServiceUnit } from "@/lib/constants/service-units"
import { formatCurrency } from "@/lib/money"
import { formatPercentValue } from "@/lib/percent"
import { formatQuantity, quantityToNumber } from "@/lib/quantity"
import { cn } from "@/lib/utils"

/** Passo 1: o resumo que se calcula sozinho (os números da proposta de exemplo). */
function BuildVisual({ quote }) {
  return (
    <div className="w-full max-w-72 rounded-xl border bg-card p-4 text-xs shadow-md">
      <ul className="flex flex-col gap-2">
        {quote.items.map((item) => (
          <li key={item.name} className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{item.name}</span>
              {item.quantity_hundredths !== 100 && (
                <span className="text-muted-foreground tabular-nums">
                  {formatQuantity(item.quantity_hundredths)}{" "}
                  {formatServiceUnit(item.unit, quantityToNumber(item.quantity_hundredths))} ×{" "}
                  {formatCurrency(item.unit_price_cents)}
                </span>
              )}
            </span>
            <span className="shrink-0 tabular-nums">{formatCurrency(item.subtotal_cents)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 flex flex-col gap-1.5 border-t pt-3 text-muted-foreground">
        <div className="flex justify-between gap-3">
          <dt>Desconto ({formatPercentValue(quote.discount_value)})</dt>
          <dd className="tabular-nums">− {formatCurrency(quote.discount_total_cents)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Impostos ({formatPercentValue(quote.tax_rate_bps)})</dt>
          <dd className="tabular-nums">+ {formatCurrency(quote.tax_total_cents)}</dd>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t pt-2.5 text-foreground">
          <dt className="font-medium">Total</dt>
          <dd className="font-display text-xl leading-none tabular-nums">{formatCurrency(quote.total_cents)}</dd>
        </div>
      </dl>
    </div>
  )
}

const CHANNELS = [
  { label: "WhatsApp", icon: MessageCircleIcon },
  { label: "E-mail", icon: MailIcon },
  { label: "PDF", icon: FileDownIcon },
]

/** Passo 2: a mensagem com o link, pronta para mandar. */
function SendVisual({ quote }) {
  const firstName = SAMPLE_CLIENT.name.split(" ")[0]
  return (
    <div className="flex w-full max-w-72 flex-col items-end gap-3">
      <div className="w-full rounded-2xl rounded-br-md border bg-card p-3 text-xs shadow-md">
        <p className="text-pretty">Oi, {firstName}! Segue a proposta para o {SAMPLE_CLIENT.company}:</p>
        <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border bg-muted/60 p-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary-ink">
            <LinkIcon className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium">Proposta Nº {quote.quote_number}</span>
            <span className="truncate text-muted-foreground">{SAMPLE_ISSUER.name}</span>
          </span>
        </div>
      </div>
      <ul className="flex gap-1.5">
        {CHANNELS.map(({ label, icon: Icon }) => (
          <li key={label} className="flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-[0.6875rem] shadow-xs">
            <Icon className="size-3 text-muted-foreground" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Classes por extenso (o Tailwind precisa ver o nome inteiro).
const TIMELINE = [
  { label: "Enviada", time: "09:12", icon: SendIcon, tone: "bg-status-sent/12 text-status-sent" },
  { label: "Visualizada", detail: "pelo link", time: "10:47", icon: EyeIcon, tone: "bg-status-viewed/12 text-status-viewed" },
  {
    label: "Aprovada",
    detail: `por ${SAMPLE_SIGNER}`,
    time: "11:05",
    icon: CircleCheckIcon,
    tone: "bg-status-approved/12 text-status-approved",
  },
]

/** Passo 3: o histórico da proposta até a aprovação. */
function CloseVisual() {
  return (
    <ol className="flex w-full max-w-72 flex-col gap-0 rounded-xl border bg-card p-4 text-xs shadow-md">
      {TIMELINE.map(({ label, detail, time, icon: Icon, tone }, index) => (
        <li key={label} className="relative flex items-center gap-3 pb-4 last:pb-0">
          {index < TIMELINE.length - 1 && <span className="absolute top-8 bottom-0 left-[calc(1rem-0.5px)] w-px bg-border" />}
          <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
            <Icon className="size-3.5" strokeWidth={2.25} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">{label}</span>
            {detail && <span className="truncate text-muted-foreground">{detail}</span>}
          </span>
          <span className="shrink-0 text-muted-foreground tabular-nums">{time}</span>
        </li>
      ))}
    </ol>
  )
}

const STEPS = [
  {
    title: "Monte",
    text: "Escolha o cliente e puxe serviços do seu catálogo ou de um modelo. Subtotal, desconto, impostos e total se calculam sozinhos.",
    visual: BuildVisual,
  },
  {
    title: "Envie",
    text: "Cada proposta tem um link próprio. Mande pelo WhatsApp ou por e-mail, ou baixe o PDF. O cliente abre no celular, sem criar conta.",
    visual: SendVisual,
  },
  {
    title: "Feche",
    text: "O cliente aprova com o nome (aceite eletrônico) ou recusa dizendo o motivo. Você vê quando ele abriu e quando respondeu.",
    visual: CloseVisual,
  },
]

/** "Como funciona": os três passos, do orçamento à aprovação. */
export function HowItWorks({ quote }) {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="como-funciona-title" eyebrow="Como funciona" title={<>Do orçamento ao “sim” em três passos.</>}>
          Sem planilha, sem documento montado à mão e sem ficar perguntando se o cliente viu.
        </SectionHeading>

        <ol className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map(({ title, text, visual: Visual }, index) => (
            <li key={title} className="flex animate-reveal flex-col overflow-hidden rounded-2xl border bg-card shadow-xs">
              <div
                aria-hidden="true"
                className="flex h-60 items-center justify-center border-b bg-[radial-gradient(80%_80%_at_50%_0%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent)] bg-muted/30 px-6"
              >
                <Visual quote={quote} />
              </div>
              <div className="flex flex-col gap-2 p-6">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-[1.75rem] leading-tight">{title}</h3>
                <p className="text-sm text-pretty text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
