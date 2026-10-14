import { CircleCheckIcon, CircleXIcon } from "lucide-react"

import { formatMoment } from "@/lib/dates"
import { describeUserAgent } from "@/lib/user-agent"
import { cn } from "@/lib/utils"

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  )
}

/**
 * Resposta do cliente na página interna do orçamento (Sprint 15): o
 * comprovante do aceite eletrônico (nome, e-mail, data, IP, navegador) ou a
 * recusa (com o motivo, se informado). Só o dono vê estes dados.
 * @param {{ response: { decision: "approved"|"declined", signer_name: string|null,
 *   signer_email: string|null, reason: string|null, ip_address: string|null,
 *   user_agent: string|null, created_at: string }, className?: string }} props
 */
export function QuoteResponseCard({ response, className }) {
  const approved = response.decision === "approved"
  const Icon = approved ? CircleCheckIcon : CircleXIcon
  const browser = describeUserAgent(response.user_agent)

  return (
    <section
      aria-labelledby="quote-response-title"
      className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm", className)}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            approved
              ? "bg-status-approved/10 text-status-approved dark:bg-status-approved/15"
              : "bg-status-declined/10 text-status-declined dark:bg-status-declined/15",
          )}
        >
          <Icon className="size-4" />
        </span>
        <h2 id="quote-response-title" className="text-sm font-semibold">
          {approved ? "Aceite eletrônico" : "Recusa do cliente"}
        </h2>
      </div>

      {approved && (
        <div className="flex min-w-0 flex-col">
          <p className="truncate font-display text-2xl leading-tight italic">{response.signer_name}</p>
          <span aria-hidden="true" className="mt-1 h-px w-full bg-foreground/20" />
        </div>
      )}

      <dl className="flex flex-col gap-3">
        {approved && (
          <Row label="E-mail">
            <a href={`mailto:${response.signer_email}`} className="text-primary-ink underline-offset-4 hover:underline">
              {response.signer_email}
            </a>
          </Row>
        )}
        <Row label={approved ? "Aprovado em" : "Recusado em"}>
          <time dateTime={response.created_at}>{formatMoment(response.created_at)}</time>
        </Row>
        {!approved && (
          <Row label="Motivo">
            {response.reason ? (
              <span className="whitespace-pre-line">{response.reason}</span>
            ) : (
              <span className="text-muted-foreground">Nenhum motivo informado.</span>
            )}
          </Row>
        )}
        {response.ip_address && (
          <Row label="Endereço IP">
            <span className="font-mono text-[0.8125rem]">{response.ip_address}</span>
          </Row>
        )}
        {browser && (
          <Row label="Navegador">
            <span title={response.user_agent}>{browser}</span>
          </Row>
        )}
      </dl>

      {approved && (
        <p className="border-t pt-3 text-xs text-pretty text-muted-foreground">
          Aceite eletrônico simples, registrado pela página da proposta. Não é uma assinatura digital certificada.
        </p>
      )}
    </section>
  )
}
