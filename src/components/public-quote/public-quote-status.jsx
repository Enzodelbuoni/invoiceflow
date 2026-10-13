import { BanIcon, CircleCheckIcon, CircleXIcon, FileTextIcon, MailIcon, MessageCircleIcon, TimerOffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { daysBetweenIso, describeDaysFromToday, formatIsoDateLong, formatIsoDateShort } from "@/lib/dates"
import { formatShortDate } from "@/lib/format"
import { formatCurrency } from "@/lib/money"
import { whatsappUrl } from "@/lib/public-quote"
import { cn } from "@/lib/utils"

// Classes por extenso (o Tailwind precisa ver o nome inteiro).
const TONES = {
  open: "bg-primary/10 text-primary-ink ring-primary/20 dark:bg-primary/15",
  approved: "bg-status-approved/10 text-status-approved ring-status-approved/20 dark:bg-status-approved/15",
  declined: "bg-status-declined/10 text-status-declined ring-status-declined/20 dark:bg-status-declined/15",
  expired: "bg-status-expired/10 text-status-expired ring-status-expired/20 dark:bg-status-expired/15",
  cancelled: "bg-status-cancelled/10 text-status-cancelled ring-status-cancelled/20 dark:bg-status-cancelled/15",
}

const ICONS = {
  open: FileTextIcon,
  approved: CircleCheckIcon,
  declined: CircleXIcon,
  expired: TimerOffIcon,
  cancelled: BanIcon,
}

/** Título e texto do aviso, conforme a situação da proposta. */
function copyFor(state, { quote, client, issuer, today }) {
  switch (state) {
    case "approved":
      return {
        title: "Proposta aprovada",
        text: quote.approved_at ? `Aprovada em ${formatShortDate(quote.approved_at)}.` : "Esta proposta já foi aprovada.",
      }
    case "declined":
      return {
        title: "Proposta recusada",
        text: quote.declined_at ? `Recusada em ${formatShortDate(quote.declined_at)}.` : "Esta proposta foi recusada.",
      }
    case "expired":
      return {
        title: "Esta proposta expirou",
        text: `A validade terminou em ${formatIsoDateShort(quote.valid_until)}. Para receber uma proposta atualizada, fale com ${issuer.name}.`,
      }
    case "cancelled":
      return {
        title: "Esta proposta foi cancelada",
        text: `${issuer.name} cancelou esta proposta. Se tiver alguma dúvida, entre em contato.`,
      }
    default:
      return {
        title: client?.name ? `Proposta para ${client.name}` : "Sua proposta",
        text: `Válida até ${formatIsoDateLong(quote.valid_until).toLowerCase()} (${describeDaysFromToday(daysBetweenIso(today, quote.valid_until))}).`,
      }
  }
}

/** Botões de contato com quem enviou (e-mail e WhatsApp, quando houver). */
function Contact({ issuer, quote }) {
  const whatsapp = whatsappUrl(issuer.phone)
  if (!issuer.email && !whatsapp) return null
  const subject = encodeURIComponent(`Proposta Nº ${quote.quote_number}`)
  return (
    <div className="flex flex-wrap gap-2">
      {issuer.email && (
        <Button asChild variant="outline" size="sm" className="h-9">
          <a href={`mailto:${issuer.email}?subject=${subject}`}>
            <MailIcon data-icon="inline-start" />
            E-mail
          </a>
        </Button>
      )}
      {whatsapp && (
        <Button asChild variant="outline" size="sm" className="h-9">
          <a href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircleIcon data-icon="inline-start" />
            WhatsApp
          </a>
        </Button>
      )}
    </div>
  )
}

/**
 * Aviso no topo da página pública: a situação da proposta (aberta, aprovada,
 * recusada, expirada, cancelada), o total e o contato de quem enviou.
 * @param {{ state: "open"|"approved"|"declined"|"expired"|"cancelled",
 *   quote: object, client: object|null, issuer: object, today: string, children?: React.ReactNode }} props
 *   `children`: ações (aprovar/recusar, Sprint 15).
 */
export function PublicQuoteStatus({ state, quote, client, issuer, today, children }) {
  const Icon = ICONS[state] ?? FileTextIcon
  const { title, text } = copyFor(state, { quote, client, issuer, today })
  const showTotal = state !== "cancelled" && typeof quote.total_cents === "number"

  return (
    <section
      aria-labelledby="public-quote-status-title"
      className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex min-w-0 items-start gap-4">
        <span
          aria-hidden="true"
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl ring-1", TONES[state])}
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 id="public-quote-status-title" className="font-display text-2xl leading-tight text-balance sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">{text}</p>
          <div className="mt-2">
            <Contact issuer={issuer} quote={quote} />
          </div>
        </div>
      </div>
      {(showTotal || children) && (
        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
          {showTotal && (
            <div className="flex flex-col sm:items-end">
              <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Total</span>
              <span className="font-display text-3xl leading-none tabular-nums">{formatCurrency(quote.total_cents)}</span>
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  )
}
