import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { IssuerContact } from "@/components/public-quote/public-quote-status"
import { Button } from "@/components/ui/button"
import { formatMoment } from "@/lib/dates"
import { formatCurrency } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * Selo animado: aparece, uma onda se espalha uma vez e o traço do ícone (✓ ou ✕)
 * é desenhado. Decorativo (o título diz o resultado).
 */
function ConfirmationMark({ approved }) {
  return (
    <span aria-hidden="true" className="relative flex size-20 items-center justify-center">
      <span
        className={cn(
          "absolute inset-0 animate-halo rounded-full",
          approved ? "bg-status-approved/25" : "bg-status-declined/20",
        )}
      />
      <span
        className={cn(
          "relative flex size-20 animate-pop items-center justify-center rounded-full ring-1",
          approved
            ? "bg-status-approved/10 text-status-approved ring-status-approved/25 dark:bg-status-approved/15"
            : "bg-status-declined/10 text-status-declined ring-status-declined/25 dark:bg-status-declined/15",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-9"
        >
          {approved ? (
            <path d="m6.5 12.5 3.5 3.5 7.5-8" pathLength="1" strokeDasharray="1" className="animate-draw" />
          ) : (
            <path d="M8 8l8 8M16 8l-8 8" pathLength="1" strokeDasharray="1" className="animate-draw" />
          )}
        </svg>
      </span>
    </span>
  )
}

function ReceiptRow({ label, children, className }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  )
}

/**
 * Confirmação depois que o cliente responde (/quote/<id>/approved e /declined,
 * Sprint 15): o resultado, o comprovante e o contato de quem enviou.
 * @param {{ decision: "approved"|"declined", publicId: string,
 *   quote: { quote_number: string, title: string, total_cents: number },
 *   issuer: { name: string, email?: string|null, phone?: string|null },
 *   response: { signer_name: string|null, responded_at: string } }} props
 */
export function PublicQuoteConfirmation({ decision, publicId, quote, issuer, response }) {
  const approved = decision === "approved"
  const firstName = response.signer_name?.trim().split(/\s+/)[0]
  const moment = formatMoment(response.responded_at)

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 text-center">
      <ConfirmationMark approved={approved} />

      <div className="flex animate-enter flex-col gap-3">
        <h1 className="font-display text-4xl leading-tight text-balance sm:text-5xl">
          {approved ? "Proposta aprovada" : "Resposta registrada"}
        </h1>
        <p className="text-pretty text-muted-foreground">
          {approved ? (
            `Obrigado${firstName ? `, ${firstName}` : ""}! O seu aceite foi registrado e já aparece para ${issuer.name}.`
          ) : (
            <>
              Você recusou a proposta <span className="whitespace-nowrap">Nº {quote.quote_number}</span>. A sua
              resposta já aparece para {issuer.name}.
            </>
          )}
        </p>
      </div>

      <section
        aria-labelledby="confirmation-receipt-title"
        className="w-full animate-enter overflow-hidden rounded-2xl border bg-card text-left shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-5 py-3">
          <h2 id="confirmation-receipt-title" className="text-sm font-semibold">
            {approved ? "Comprovante do aceite" : "Resumo da resposta"}
          </h2>
          <span className="font-mono text-xs text-muted-foreground">Nº {quote.quote_number}</span>
        </div>
        <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          <ReceiptRow label="Proposta" className="sm:col-span-2">
            {quote.title}
          </ReceiptRow>
          <ReceiptRow label="Enviada por">{issuer.name}</ReceiptRow>
          <ReceiptRow label="Valor total">
            <span className="tabular-nums">{formatCurrency(quote.total_cents)}</span>
          </ReceiptRow>
          {approved && (
            <ReceiptRow label="Aprovada por">
              <span className="font-display text-xl leading-tight italic">{response.signer_name}</span>
            </ReceiptRow>
          )}
          <ReceiptRow label={approved ? "Data e hora do aceite" : "Recusada em"}>
            <time dateTime={response.responded_at}>{moment}</time>
            <span className="block text-xs text-muted-foreground">Horário de Brasília</span>
          </ReceiptRow>
        </dl>
        {approved && (
          <p className="border-t px-5 py-3 text-xs text-pretty text-muted-foreground">
            Aceite eletrônico registrado pela página da proposta, com nome, e-mail, data e hora, endereço IP e
            navegador.
          </p>
        )}
      </section>

      <div className="flex animate-enter flex-col items-center gap-3" style={{ animationDelay: "240ms" }}>
        <p className="text-sm text-pretty text-muted-foreground">
          {approved
            ? `${issuer.name} vai falar com você para combinar os próximos passos.`
            : `Mudou de ideia ou quer negociar? Fale com ${issuer.name}.`}
        </p>
        <IssuerContact issuer={issuer} quote={quote} />
        <Button asChild variant="link" className="mt-1">
          <Link href={`/quote/${publicId}`}>
            <ArrowLeftIcon data-icon="inline-start" />
            Ver a proposta
          </Link>
        </Button>
      </div>
    </div>
  )
}
