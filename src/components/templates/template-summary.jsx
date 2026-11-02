"use client"

import { useWatch } from "react-hook-form"

import { SummaryActions, SummaryFigures } from "@/components/quotes/quote-summary"
import { validityDaysFromInput } from "@/lib/validations/quote-template"

/** "Validade de 15 dias a partir da criação" (ou o aviso enquanto o campo está inválido). */
function validityText(days) {
  if (!days) return "Informe a validade em dias"
  return `Validade de ${days === 1 ? "1 dia" : `${days} dias`} a partir da criação`
}

/**
 * Resumo do editor de modelos (etapa 41): nome, título sugerido, os mesmos
 * números do resumo do orçamento (total estimado) e as ações. Fica fixo ao
 * lado do formulário com duas colunas; numa coluna, a QuoteTotalBar cobre.
 * @param {{ control: object, saving?: boolean, saveLabel: string, onPreview: (triggerId: string) => void }} props
 */
export function TemplateSummary({ control, saving = false, saveLabel, onPreview }) {
  const [name, title, validityDays] = useWatch({ control, name: ["name", "title", "validity_days"] })
  const suggested = title?.trim()

  return (
    <aside
      id="template-summary"
      aria-labelledby="template-summary-title"
      className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm @4xl:sticky @4xl:top-20"
    >
      <div className="flex flex-col gap-1 border-b px-5 py-4">
        <p className="text-xs font-medium tracking-[0.14em] text-primary-ink uppercase">Resumo do modelo</p>
        <h2 id="template-summary-title" className="truncate font-medium">
          {name?.trim() || <span className="text-muted-foreground">Modelo sem nome</span>}
        </h2>
        <p className="truncate text-sm text-muted-foreground">
          {suggested ? (
            <>
              <span className="sr-only">Título sugerido: </span>“{suggested}”
            </>
          ) : (
            "Sem título sugerido"
          )}
        </p>
      </div>

      <SummaryFigures control={control} totalLabel="Total estimado">
        <p className="text-xs text-muted-foreground">{validityText(validityDaysFromInput(validityDays))}</p>
      </SummaryFigures>

      <SummaryActions
        saving={saving}
        saveLabel={saveLabel}
        onPreview={onPreview}
        footer={<p className="text-center text-xs text-muted-foreground">O cliente é escolhido ao usar o modelo.</p>}
      />
    </aside>
  )
}
