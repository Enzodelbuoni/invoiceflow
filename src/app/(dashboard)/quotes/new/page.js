import { PageHeader } from "@/components/layout/page-header"
import { QuoteForm } from "@/components/quotes/quote-form"
import { listClientOptions } from "@/lib/data/clients"
import { todayIso } from "@/lib/dates"

export const metadata = { title: "Novo orçamento" }

export default async function NewQuotePage() {
  const clients = await listClientOptions()

  return (
    <>
      <PageHeader
        eyebrow="Orçamentos"
        title="Novo orçamento"
        description="Monte a proposta por etapas. O total é atualizado enquanto você preenche."
      />
      <QuoteForm today={todayIso()} clients={clients} />
    </>
  )
}
