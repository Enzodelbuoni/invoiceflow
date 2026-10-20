import { PageHeader } from "@/components/layout/page-header"
import { QuoteForm } from "@/components/quotes/quote-form"
import { requireUser } from "@/lib/auth/server"
import { listClientOptions } from "@/lib/data/clients"
import { getIssuer } from "@/lib/data/profiles"
import { listServiceOptions } from "@/lib/data/services"
import { todayIso } from "@/lib/dates"

export const metadata = { title: "Novo orçamento" }

export default async function NewQuotePage({ searchParams }) {
  const [user, clients, services, issuer, { cliente }] = await Promise.all([
    requireUser(),
    listClientOptions(),
    listServiceOptions(),
    getIssuer(),
    searchParams,
  ])
  // "Criar orçamento" na página do cliente (?cliente=<id>): só vale um cliente da própria lista.
  const initialClientId = clients.find((client) => client.id === cliente)?.id

  return (
    <>
      <PageHeader
        eyebrow="Orçamentos"
        title="Novo orçamento"
        description="Monte a proposta por etapas. O total é atualizado enquanto você preenche."
      />
      <QuoteForm today={todayIso()} userId={user.id} clients={clients} services={services} issuer={issuer} initialClientId={initialClientId} />
    </>
  )
}
