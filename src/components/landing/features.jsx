import {
  ActivityIcon,
  ChartColumnIcon,
  CircleCheckIcon,
  CopyIcon,
  FileDownIcon,
  LayoutTemplateIcon,
  MailIcon,
  MessageCircleIcon,
  PaletteIcon,
  Share2Icon,
  SignatureIcon,
} from "lucide-react"

import { SAMPLE_ISSUER, SAMPLE_SIGNER } from "@/components/landing/sample-quote"
import { SectionHeading } from "@/components/landing/section-heading"
import { StatusBadge } from "@/components/shared/status-badge"
import { buttonVariants } from "@/components/ui/button"
import { QUOTE_STATUS } from "@/lib/constants/quote-status"
import { formatMoment, todayIso } from "@/lib/dates"
import { formatPercent } from "@/lib/format"
import { initials } from "@/lib/initials"
import { formatCurrency } from "@/lib/money"
import { cn } from "@/lib/utils"

/** Rótulo pequeno em versalete, como no documento. */
function Eyebrow({ children, className }) {
  return (
    <p className={cn("text-[0.625rem] font-semibold tracking-[0.16em] text-primary-ink uppercase", className)}>
      {children}
    </p>
  )
}

/** Aceite eletrônico: o nome no lugar da assinatura, com data e hora. */
function AcceptanceVisual({ quote }) {
  const signedAt = `${todayIso(new Date(quote.sent_at))}T11:05:00-03:00`
  return (
    <div className="w-full max-w-md rounded-xl border border-status-approved/30 bg-card p-5 shadow-md">
      <div className="flex items-start justify-between gap-4">
        <Eyebrow>Aceite eletrônico</Eyebrow>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-status-approved">
          <CircleCheckIcon className="size-3.5" />
          Proposta aprovada
        </span>
      </div>
      <p className="mt-3 font-display text-4xl leading-tight italic">{SAMPLE_SIGNER}</p>
      <span className="mt-1 block h-px w-full max-w-72 bg-foreground/25" />
      <p className="mt-2 text-xs text-pretty text-muted-foreground">
        Aceito eletronicamente em {formatMoment(signedAt)} (horário de Brasília).
      </p>
    </div>
  )
}

/** Duas folhas A4 com a faixa da marca e o rodapé com as páginas. */
function PdfVisual() {
  return (
    <div className="relative h-44 w-40">
      <div className="absolute top-2 left-7 aspect-[1/1.414] w-28 rotate-6 rounded-sm border bg-card shadow-sm" />
      <div className="theme-paper absolute top-0 left-2 flex aspect-[1/1.414] w-28 -rotate-3 flex-col overflow-hidden rounded-sm shadow-lg ring-1 ring-black/5">
        <span className="h-1 bg-primary" />
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <span className="h-1.5 w-8 rounded-full bg-primary/70" />
          <span className="mt-1 h-2 w-16 rounded-full bg-foreground/80" />
          <span className="h-1 w-20 rounded-full bg-foreground/15" />
          <span className="mt-1.5 h-1 w-full rounded-full bg-foreground/10" />
          <span className="h-1 w-full rounded-full bg-foreground/10" />
          <span className="h-1 w-3/4 rounded-full bg-foreground/10" />
          <span className="mt-auto ml-auto h-1.5 w-10 rounded-full bg-foreground/70" />
          <span className="text-center text-[0.375rem] text-muted-foreground">Página 1 de 2</span>
        </div>
      </div>
      <span className="absolute right-0 bottom-3 flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[0.6875rem] font-medium shadow-sm">
        <FileDownIcon className="size-3 text-primary-ink" />
        PDF
      </span>
    </div>
  )
}

/** O diálogo de compartilhar: mensagem pronta e os canais. */
function ShareVisual({ quote }) {
  return (
    <div className="w-full max-w-64 rounded-xl border bg-card p-3.5 text-xs shadow-md">
      <Eyebrow className="text-muted-foreground">Mensagem</Eyebrow>
      <p className="mt-1.5 rounded-md border bg-muted/50 p-2 text-pretty">
        Segue a proposta Nº {quote.quote_number}. É só abrir o link para ver e aprovar.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {[
          { label: "WhatsApp", icon: MessageCircleIcon, primary: true },
          { label: "E-mail", icon: MailIcon },
          { label: "Copiar", icon: CopyIcon },
        ].map(({ label, icon: Icon, primary }) => (
          <span
            key={label}
            className={cn(
              buttonVariants({ variant: primary ? "default" : "outline", size: "sm" }),
              "h-8 gap-1 px-0 text-[0.6875rem]",
              primary && "col-span-2",
            )}
          >
            <Icon className="size-3" />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// Ilustrativo: propostas enviadas e aprovadas nos últimos seis meses.
const SERIES = [
  { sent: 6, approved: 3 },
  { sent: 9, approved: 5 },
  { sent: 7, approved: 4 },
  { sent: 11, approved: 7 },
  { sent: 8, approved: 5 },
  { sent: 12, approved: 8 },
]

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })

/** "jun", "jul"… dos seis meses até o atual. */
function lastMonths(today, count) {
  const [year, month] = today.split("-").map(Number)
  return Array.from({ length: count }, (_, index) =>
    monthFormatter.format(new Date(Date.UTC(year, month - count + index, 15))).replace(".", ""),
  )
}

/** Conversão + colunas "enviadas e aprovadas", como no painel. */
function MetricsVisual({ quote }) {
  const months = lastMonths(todayIso(new Date(quote.sent_at)), SERIES.length)
  const sent = SERIES.reduce((sum, month) => sum + month.sent, 0)
  const approved = SERIES.reduce((sum, month) => sum + month.approved, 0)
  const max = Math.max(...SERIES.map((month) => month.sent))
  // Arredondada para inteiro, como num destaque (62%, não 62,3%).
  const conversion = Math.round((approved / sent) * 100) / 100

  return (
    <div className="flex w-full max-w-md flex-col gap-5 rounded-xl border bg-card p-5 shadow-md sm:flex-row sm:items-end">
      <div className="flex shrink-0 flex-col gap-2 sm:w-36">
        <Eyebrow className="text-muted-foreground">Conversão</Eyebrow>
        <p className="font-display text-5xl leading-none tabular-nums">{formatPercent(conversion)}</p>
        <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-viz-approved" style={{ width: `${conversion * 100}%` }} />
        </span>
        <p className="text-xs text-muted-foreground">
          {approved} de {sent} aprovadas
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex h-28 items-end gap-2">
          {SERIES.map((month, index) => (
            <div key={months[index]} className="flex h-full flex-1 flex-col justify-end">
              <div
                className="flex flex-col justify-end overflow-hidden rounded-t-[3px] bg-viz-reached"
                style={{ height: `${(month.sent / max) * 100}%` }}
              >
                <div className="bg-viz-approved" style={{ height: `${(month.approved / month.sent) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t pt-1.5 text-[0.625rem] text-muted-foreground">
          {months.map((month) => (
            <span key={month} className="flex-1 text-center">
              {month}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const TEMPLATES = [
  { name: "Identidade visual", total: 320000 },
  { name: "Site institucional", total: 480000 },
  { name: "Social media mensal", total: 194400 },
]

/** Modelos empilhados, prontos para usar. */
function TemplatesVisual() {
  return (
    <ul className="relative h-36 w-full max-w-60">
      {TEMPLATES.map(({ name, total }, index) => (
        <li
          key={name}
          className="absolute inset-x-0 flex items-center gap-3 rounded-xl border bg-card p-3 text-xs shadow-md"
          style={{ top: `${index * 2.75}rem`, scale: 0.9 + index * 0.05, zIndex: index }}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-primary/8 text-primary-ink">
            <LayoutTemplateIcon className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="text-muted-foreground tabular-nums">{formatCurrency(total)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// Cores de destaque de exemplo (a escolhida é a segunda).
const ACCENTS = ["#4f46e5", "#0f766e", "#c2410c", "#be185d", "#334155"]
const CHOSEN_ACCENT = ACCENTS[1]

/** Logo (iniciais) e cor de destaque aplicadas no topo do documento. */
function BrandVisual() {
  return (
    <div className="flex w-full max-w-60 flex-col items-center gap-4">
      <div className="theme-paper w-full overflow-hidden rounded-lg shadow-md ring-1 ring-black/5">
        <span className="block h-1.5" style={{ backgroundColor: CHOSEN_ACCENT }} />
        <div className="flex items-center gap-2.5 p-3">
          <span
            className="flex size-8 items-center justify-center rounded-md text-[0.6875rem] font-semibold text-white"
            style={{ backgroundColor: CHOSEN_ACCENT }}
          >
            {initials(SAMPLE_ISSUER.name)}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-sm">{SAMPLE_ISSUER.name}</span>
            <span className="text-[0.625rem] font-semibold tracking-[0.14em] uppercase" style={{ color: CHOSEN_ACCENT }}>
              Proposta comercial
            </span>
          </span>
        </div>
      </div>
      <ul className="flex gap-2">
        {ACCENTS.map((color) => (
          <li
            key={color}
            className={cn(
              "size-6 rounded-full ring-offset-2 ring-offset-background",
              color === CHOSEN_ACCENT ? "ring-2 ring-foreground/70" : "ring-1 ring-black/10",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </ul>
    </div>
  )
}

const STATUSES = [
  QUOTE_STATUS.DRAFT,
  QUOTE_STATUS.SENT,
  QUOTE_STATUS.VIEWED,
  QUOTE_STATUS.APPROVED,
  QUOTE_STATUS.DECLINED,
  QUOTE_STATUS.EXPIRED,
]

/** As situações de uma proposta. */
function StatusVisual() {
  return (
    <ul className="flex max-w-60 flex-wrap justify-center gap-2">
      {STATUSES.map((status) => (
        <li key={status}>
          <StatusBadge status={status} />
        </li>
      ))}
    </ul>
  )
}

const FEATURES = [
  {
    title: "Aceite eletrônico",
    text: "O cliente aprova pelo link digitando o nome e o e-mail. Data e hora do aceite ficam no documento e no PDF.",
    icon: SignatureIcon,
    visual: AcceptanceVisual,
    wide: true,
  },
  {
    title: "PDF pronto",
    text: "Em A4, com a sua marca e as páginas numeradas, para anexar onde quiser.",
    icon: FileDownIcon,
    visual: PdfVisual,
  },
  {
    title: "WhatsApp e e-mail",
    text: "Mensagem pronta e editável com o link, para mandar pelo canal que o cliente usa.",
    icon: Share2Icon,
    visual: ShareVisual,
  },
  {
    title: "Métricas de conversão",
    text: "Quanto você enviou, quanto fechou e quanto ainda está em aberto, por período.",
    icon: ChartColumnIcon,
    visual: MetricsVisual,
    wide: true,
  },
  {
    title: "Modelos de orçamento",
    text: "Itens, condições e termos que você repete, salvos para virar uma proposta em segundos.",
    icon: LayoutTemplateIcon,
    visual: TemplatesVisual,
  },
  {
    title: "Sua marca",
    text: "Logo e cor de destaque no documento, no PDF e na página que o cliente abre.",
    icon: PaletteIcon,
    visual: BrandVisual,
  },
  {
    title: "Situação de cada proposta",
    text: "Rascunho, enviada, visualizada, aprovada… e a validade vence sozinha, sem você controlar.",
    icon: ActivityIcon,
    visual: StatusVisual,
    // Com duas colunas, o último cartão ficaria sozinho na linha.
    wideOnTablet: true,
  },
]

/** "Recursos": os diferenciais numa grade (dois cartões largos). */
export function Features({ quote }) {
  return (
    <section id="recursos" aria-labelledby="recursos-title" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="recursos-title" eyebrow="Recursos" title="Tudo o que uma proposta profissional precisa.">
          Do primeiro rascunho ao aceite do cliente, sem trocar de ferramenta.
        </SectionHeading>

        <ul className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, text, icon: Icon, visual: Visual, wide, wideOnTablet }) => (
            <li
              key={title}
              className={cn(
                "flex animate-reveal flex-col overflow-hidden rounded-2xl border bg-card shadow-xs",
                wide && "md:col-span-2",
                wideOnTablet && "md:max-lg:col-span-2",
              )}
            >
              <div
                aria-hidden="true"
                className="flex min-h-56 flex-1 items-center justify-center border-b bg-[radial-gradient(80%_80%_at_50%_0%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent)] bg-muted/30 px-6 py-8"
              >
                <Visual quote={quote} />
              </div>
              <div className="flex flex-col gap-2 p-6">
                <h3 className="flex items-center gap-2.5 font-display text-2xl leading-tight">
                  <Icon aria-hidden="true" className="size-5 shrink-0 text-primary-ink" strokeWidth={1.75} />
                  {title}
                </h3>
                <p className="text-sm text-pretty text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
