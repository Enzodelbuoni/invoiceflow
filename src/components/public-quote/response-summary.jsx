import { formatCurrency } from "@/lib/money"

// Peças comuns dos diálogos de resposta da página pública (aprovar/recusar).

export const OFFLINE_MESSAGE = "Não foi possível falar com o servidor. Confira sua conexão e tente de novo."

/** O que está sendo respondido: número, título e total da proposta. */
export function ResponseSummary({ quote }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 p-3.5 text-sm">
      <dt className="text-muted-foreground">Proposta</dt>
      <dd className="truncate font-medium">
        Nº {quote.quote_number} · {quote.title}
      </dd>
      <dt className="text-muted-foreground">Total</dt>
      <dd className="font-medium tabular-nums">{formatCurrency(quote.total_cents)}</dd>
    </dl>
  )
}
