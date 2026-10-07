"use client"

import { ReceiptTextIcon, TagIcon } from "lucide-react"

import { ComingSoonButton } from "@/components/shared/coming-soon-button"

const MESSAGE = "Desconto e impostos chegam nas próximas etapas."

function AdjustmentRow({ icon: Icon, title, description, emptyLabel }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      <span className="hidden text-sm text-muted-foreground sm:inline">{emptyLabel}</span>
      <ComingSoonButton variant="outline" size="sm" message={MESSAGE}>
        Adicionar
      </ComingSoonButton>
    </div>
  )
}

// Desconto (DiscountField) e impostos (TaxField). Por enquanto só a estrutura.
export function QuoteAdjustments() {
  return (
    <div className="flex flex-col divide-y">
      <AdjustmentRow icon={TagIcon} title="Desconto" description="Percentual ou valor fixo sobre o subtotal." emptyLabel="Sem desconto" />
      <AdjustmentRow
        icon={ReceiptTextIcon}
        title="Impostos"
        description="Percentual que você repassa no preço, como o ISS."
        emptyLabel="Sem impostos"
      />
    </div>
  )
}
