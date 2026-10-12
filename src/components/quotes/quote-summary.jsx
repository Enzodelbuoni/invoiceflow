"use client"

import { EyeIcon, SaveIcon } from "lucide-react"
import { useWatch } from "react-hook-form"

import { ComingSoonButton } from "@/components/shared/coming-soon-button"
import { Button } from "@/components/ui/button"
import { daysBetweenIso, describeDaysFromToday, formatIsoDateShort } from "@/lib/dates"
import { formatCurrency } from "@/lib/money"

// Valores zerados até o motor de cálculos (Sprint 8): calculateQuoteTotals(items, discount, tax).
const EMPTY_TOTALS = Object.freeze({ subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0 })

function SummaryRow({ label, sign, cents }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">
        {sign && <span className="text-muted-foreground">{sign} </span>}
        {formatCurrency(cents)}
      </dd>
    </div>
  )
}

function ValidityLine({ control, today }) {
  const validUntil = useWatch({ control, name: "valid_until" })
  const date = formatIsoDateShort(validUntil)
  if (!date) return <p className="text-xs text-muted-foreground">Sem data de validade</p>
  return (
    <p className="text-xs text-muted-foreground">
      Válido até {date} ({describeDaysFromToday(daysBetweenIso(today, validUntil))})
    </p>
  )
}

/**
 * Resumo financeiro + ações (QuoteSummary e QuoteActions do plano). No desktop
 * fica fixo ao lado do formulário enquanto a página rola.
 */
export function QuoteSummary({ control, today, clients }) {
  const [title, clientId] = useWatch({ control, name: ["title", "client_id"] })
  const client = clients.find((option) => option.id === clientId)
  const totals = EMPTY_TOTALS

  return (
    <aside
      aria-labelledby="quote-summary-title"
      className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm lg:sticky lg:top-20"
    >
      <div className="flex flex-col gap-1 border-b px-5 py-4">
        <p className="text-xs font-medium tracking-[0.14em] text-primary-ink uppercase">Resumo</p>
        <h2 id="quote-summary-title" className="truncate font-medium">
          {title?.trim() || <span className="text-muted-foreground">Orçamento sem título</span>}
        </h2>
        <p className="truncate text-sm text-muted-foreground">
          {client ? (
            <>
              Para <span className="font-medium text-foreground">{client.name}</span>
              {client.company && ` · ${client.company}`}
            </>
          ) : (
            "Cliente não selecionado"
          )}
        </p>
      </div>

      <dl className="flex flex-col gap-2.5 px-5 py-4 text-sm">
        <SummaryRow label="Subtotal" cents={totals.subtotal} />
        <SummaryRow label="Desconto" sign="−" cents={totals.discountTotal} />
        <SummaryRow label="Impostos" sign="+" cents={totals.taxTotal} />
      </dl>

      <div className="flex flex-col gap-1 border-t bg-muted/40 px-5 py-4 dark:bg-muted/20">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-medium">Total</span>
          <span className="font-display text-4xl leading-none tabular-nums">{formatCurrency(totals.total)}</span>
        </div>
        <ValidityLine control={control} today={today} />
      </div>

      <div className="flex flex-col gap-2 border-t p-5">
        {/* Envia o formulário: valida tudo (erros destacados e foco no primeiro). */}
        <Button type="submit" className="h-10 shadow-sm">
          <SaveIcon data-icon="inline-start" />
          Salvar rascunho
        </Button>
        <ComingSoonButton variant="outline" className="h-10" message="A pré-visualização do documento chega na Fase 4.">
          <EyeIcon data-icon="inline-start" />
          Pré-visualizar
        </ComingSoonButton>
      </div>
    </aside>
  )
}
