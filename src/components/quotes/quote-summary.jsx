"use client"

import { AnimatePresence, motion } from "motion/react"
import { EyeIcon, SaveIcon } from "lucide-react"
import { useWatch } from "react-hook-form"

import { ComingSoonButton } from "@/components/shared/coming-soon-button"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { MAX_TOTAL_CENTS, calculateQuoteTotals, totalsInputFromForm } from "@/lib/calculations/quote"
import { DISCOUNT_TYPE } from "@/lib/constants/discount-types"
import { daysBetweenIso, describeDaysFromToday, formatIsoDateShort } from "@/lib/dates"
import { formatCurrency } from "@/lib/money"
import { formatPercentValue } from "@/lib/percent"
import { cn } from "@/lib/utils"

const plural = (count) => `${count} ${count === 1 ? "item" : "itens"}`

/** Centavos → "R$ 1.500,00"; `null` (acima do teto) → "—". */
const money = (cents) => (cents === null ? "—" : formatCurrency(cents))

/**
 * Linha do resumo. `active = false`: o ajuste não está ligado (valor esmaecido).
 * `note`: aviso embaixo da linha (ex.: desconto maior que o subtotal).
 */
function SummaryRow({ label, sign, cents, active = true, note }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className={cn("tabular-nums", !active && "text-muted-foreground")}>
          {sign && cents !== null && <span className="text-muted-foreground">{sign} </span>}
          {money(cents)}
        </dd>
      </div>
      {note && <p className="text-xs text-destructive">{note}</p>}
    </div>
  )
}

/**
 * Valor que troca com uma animação curta (o antigo sobe e some, o novo entra
 * por baixo). Com movimento reduzido, o MotionConfig global desliga.
 */
function AnimatedAmount({ text, className }) {
  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          initial={{ y: "55%", opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-55%", opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** Tamanho do total conforme o comprimento, para R$ 999.999.999,99 caber na coluna. */
function totalSizeClass(text) {
  if (text.length <= 12) return "text-4xl"
  if (text.length <= 15) return "text-3xl"
  return "text-2xl"
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
 * Resumo financeiro + ações (QuoteSummary e QuoteActions do plano), calculado
 * ao vivo pelo motor de cálculos a partir do que está digitado. No desktop fica
 * fixo ao lado do formulário enquanto a página rola. `footer`: linha embaixo
 * das ações (o indicador da cópia de segurança local). `saving`: o orçamento
 * está sendo salvo (botão desativado com "Salvando…"). `saveLabel`: texto do
 * botão de salvar ("Salvar rascunho" ou, na edição, "Salvar alterações").
 */
export function QuoteSummary({ control, today, clients, footer, saving = false, saveLabel = "Salvar rascunho" }) {
  const [title, clientId, items, discountType, discountValue, taxEnabled, taxRate] = useWatch({
    control,
    name: ["title", "client_id", "items", "discount_type", "discount_value", "tax_enabled", "tax_rate"],
  })
  const client = clients.find((option) => option.id === clientId)

  const input = totalsInputFromForm({
    items,
    discount_type: discountType,
    discount_value: discountValue,
    tax_enabled: taxEnabled,
    tax_rate: taxRate,
  })
  const totals = calculateQuoteTotals(input)
  const itemCount = items?.length ?? 0

  const discountLabel =
    input.discount_type === DISCOUNT_TYPE.PERCENT ? `Desconto (${formatPercentValue(input.discount_value)})` : "Desconto"
  const taxLabel = input.tax_rate_bps ? `Impostos (${formatPercentValue(input.tax_rate_bps)})` : "Impostos"
  const totalText = totals.total === null ? "Acima do limite" : formatCurrency(totals.total)

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
        <SummaryRow label={itemCount ? `Subtotal (${plural(itemCount)})` : "Subtotal"} cents={totals.subtotal} />
        <SummaryRow
          label={discountLabel}
          sign="−"
          cents={totals.discountTotal}
          active={Boolean(input.discount_type)}
          note={totals.discountExceedsSubtotal ? "O desconto digitado passa do subtotal." : null}
        />
        <SummaryRow label={taxLabel} sign="+" cents={totals.taxTotal} active={Boolean(input.tax_rate_bps)} />
      </dl>

      <div className="flex flex-col gap-1 border-t bg-muted/40 px-5 py-4 dark:bg-muted/20">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-sm font-medium">Total</span>
          <AnimatedAmount
            text={totalText}
            className={cn(
              "font-display leading-none tabular-nums",
              totals.total === null ? "text-2xl text-destructive" : totalSizeClass(totalText),
            )}
          />
        </div>
        {totals.total === null && (
          <p className="text-xs text-destructive">
            Os valores passam de {formatCurrency(MAX_TOTAL_CENTS)}. Confira quantidades e preços.
          </p>
        )}
        <ValidityLine control={control} today={today} />
      </div>

      <div className="flex flex-col gap-2 border-t p-5">
        {/* Envia o formulário: valida tudo (erros destacados e foco no primeiro) e salva na conta. */}
        <Button type="submit" disabled={saving} aria-busy={saving || undefined} className="h-10 shadow-sm">
          {saving ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <SaveIcon data-icon="inline-start" />}
          {saving ? "Salvando…" : saveLabel}
        </Button>
        <ComingSoonButton variant="outline" className="h-10" message="A pré-visualização do documento chega na Fase 4.">
          <EyeIcon data-icon="inline-start" />
          Pré-visualizar
        </ComingSoonButton>
        {footer}
      </div>
    </aside>
  )
}
