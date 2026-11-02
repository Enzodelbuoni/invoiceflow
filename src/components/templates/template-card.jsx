import Link from "next/link"
import { ArrowRightIcon, LayoutTemplateIcon, PackageIcon } from "lucide-react"

import { TemplateActions } from "@/components/templates/template-actions"
import { Button } from "@/components/ui/button"
import { formatServiceUnit } from "@/lib/constants/service-units"
import { formatShortDate } from "@/lib/format"
import { formatCurrency } from "@/lib/money"
import { formatQuantity, quantityToNumber } from "@/lib/quantity"
import { templateHighlights, templateItemsLabel, templateTotals } from "@/lib/quote-template"

/** Quantos itens o cartão mostra (o resto vira "+ N itens"). */
const VISIBLE_ITEMS = 3

/** "2 projetos", "1,5 hora". */
function quantityLabel(item) {
  return `${formatQuantity(item.quantity_hundredths)} ${formatServiceUnit(item.unit, quantityToNumber(item.quantity_hundredths))}`
}

/**
 * Cartão de um modelo na lista: nome, título sugerido, os primeiros itens, o
 * que mais ele traz (desconto, impostos, validade, termos), o total estimado
 * e "Usar modelo" (orçamento novo já preenchido com ele). O nome leva à edição.
 * @param {{ template: object, index?: number }} props modelo com `items` em ordem
 */
export function TemplateCard({ template, index = 0 }) {
  const { total } = templateTotals(template)
  const hidden = template.items.length - VISIBLE_ITEMS

  return (
    <li
      className="group/card flex animate-enter flex-col rounded-2xl border bg-card shadow-xs transition-[box-shadow,translate] duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="flex items-start gap-3 p-5 pb-4">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-primary/8 text-primary-ink transition-colors group-hover/card:bg-primary/12"
        >
          <LayoutTemplateIcon className="size-5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="font-display text-[1.375rem] leading-tight wrap-anywhere">
            <Link
              href={`/templates/${template.id}/edit`}
              className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="sr-only">Editar o modelo </span>
              {template.name}
            </Link>
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {template.title ? (
              <>
                <span className="sr-only">Título da proposta: </span>“{template.title}”
              </>
            ) : (
              "Sem título sugerido"
            )}
          </p>
        </div>
        <div className="-mt-1 -mr-1.5 max-md:-mt-2 max-md:-mr-2.5">
          <TemplateActions template={template} />
        </div>
      </div>

      <div className="px-5 pb-5">
        {template.items.length ? (
          <ul className="divide-y rounded-xl border bg-muted/30 text-sm" aria-label={templateItemsLabel(template.items.length)}>
            {template.items.slice(0, VISIBLE_ITEMS).map((item) => (
              <li key={item.position} className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                  {quantityLabel(item)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
            <PackageIcon aria-hidden="true" className="size-4 shrink-0" />
            Sem itens: só condições e textos
          </p>
        )}
        {hidden > 0 && (
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            + {hidden === 1 ? "1 item" : `${hidden} itens`}
          </p>
        )}

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="O que o modelo traz">
          {templateHighlights(template).map((text) => (
            <li key={text} className="rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-t px-5 pt-4 pb-5">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted-foreground">
            Total estimado · {templateItemsLabel(template.items.length).toLowerCase()}
          </span>
          <span className="font-display text-2xl leading-tight tabular-nums">
            {template.items.length && total !== null ? formatCurrency(total) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">Atualizado em {formatShortDate(template.updated_at)}</span>
        </div>
        <Button asChild className="h-10 shadow-sm">
          <Link href={`/quotes/new?modelo=${template.id}`}>
            Usar modelo
            <ArrowRightIcon data-icon="inline-end" className="transition-transform group-hover/card:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </li>
  )
}
