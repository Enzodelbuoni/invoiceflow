"use client"

import { ListPlusIcon, PackageIcon, PencilLineIcon } from "lucide-react"

import { QuoteSectionEmpty } from "@/components/quotes/quote-section"
import { ComingSoonButton } from "@/components/shared/coming-soon-button"

const MESSAGE = "A lista de itens chega nas próximas etapas."

// Itens do orçamento. Por enquanto só o estado vazio; as linhas (quantidade,
// preço, subtotal) chegam nas próximas partes, com useFieldArray.
export function QuoteItems() {
  return (
    <QuoteSectionEmpty
      icon={ListPlusIcon}
      title="Nenhum item ainda"
      description="Adicione serviços do seu catálogo (nome e preço vêm prontos) ou um item avulso só para este orçamento."
    >
      <ComingSoonButton variant="outline" className="h-9" message={MESSAGE}>
        <PackageIcon data-icon="inline-start" />
        Do catálogo
      </ComingSoonButton>
      <ComingSoonButton variant="ghost" className="h-9" message={MESSAGE}>
        <PencilLineIcon data-icon="inline-start" />
        Item avulso
      </ComingSoonButton>
    </QuoteSectionEmpty>
  )
}
