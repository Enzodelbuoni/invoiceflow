"use client"

import { useEffect, useState } from "react"
import { EyeIcon, SaveIcon } from "lucide-react"

import { AnimatedAmount, useQuoteTotals } from "@/components/quotes/quote-summary"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const plural = (count) => `${count} ${count === 1 ? "item" : "itens"}`

/** Tamanho do total na barra conforme o comprimento (R$ 999.999.999,99 cabe a 360 px). */
function amountSizeClass(text) {
  if (text.length <= 12) return "text-2xl"
  if (text.length <= 15) return "text-xl"
  return "text-lg"
}

/**
 * Barra fixa no rodapé do construtor quando ele tem uma coluna só (celular, ou
 * a sidebar aberta numa tela média): o total ao vivo, "Pré-visualizar" e
 * "Salvar" sempre à mão enquanto a pessoa preenche as seções (o resumo completo
 * só aparece depois delas). Com duas colunas não existe (o resumo já fica fixo
 * ao lado: `@4xl:hidden`, mesma medida da grade do QuoteForm).
 *
 * Fica no fim do formulário com `sticky bottom`: gruda na borda de baixo da
 * área que rola (a página no celular, o painel no desktop) e, no fim da página,
 * o espaço dela fica livre embaixo do resumo, sem cobri-lo. Some (e sai do Tab)
 * quando as ações do resumo (`#quote-summary-actions`) aparecem, para não haver
 * dois "Salvar" na tela.
 * @param {{ control: object, saving?: boolean, onPreview: () => void }} props
 */
export function QuoteTotalBar({ control, saving = false, onPreview }) {
  const { totals, itemCount, totalText } = useQuoteTotals(control)
  const [summaryVisible, setSummaryVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById("quote-summary-actions")
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => setSummaryVisible(entry.isIntersecting), { threshold: 0.5 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      data-quote-bar=""
      inert={summaryVisible}
      className={cn(
        "sticky bottom-3 z-20 transition-[opacity,translate] duration-300 ease-out-expo @4xl:hidden print:hidden",
        summaryVisible && "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <div className="flex items-center gap-2 rounded-2xl border bg-card/85 py-2.5 pr-2.5 pl-4 shadow-lg backdrop-blur-xl backdrop-saturate-150">
        <p className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs text-muted-foreground">
            Total{itemCount > 0 && ` · ${plural(itemCount)}`}
          </span>
          <AnimatedAmount
            text={totalText}
            className={cn(
              "font-display leading-tight tabular-nums",
              totals.total === null ? "text-lg text-destructive" : amountSizeClass(totalText),
            )}
          />
        </p>
        <Button
          id="quote-bar-preview"
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0"
          onClick={onPreview}
        >
          <EyeIcon />
          <span className="sr-only">Pré-visualizar</span>
        </Button>
        <Button type="submit" disabled={saving} aria-busy={saving || undefined} className="h-10 shrink-0 px-4 shadow-sm">
          {saving ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <SaveIcon data-icon="inline-start" />}
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  )
}
