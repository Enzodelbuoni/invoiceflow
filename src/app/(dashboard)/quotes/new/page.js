import { PageHeader } from "@/components/layout/page-header"
import { QuoteForm } from "@/components/quotes/quote-form"
import { requireUser } from "@/lib/auth/server"
import { listClientOptions } from "@/lib/data/clients"
import { getIssuer } from "@/lib/data/profiles"
import { getQuoteTemplate, listQuoteTemplateOptions } from "@/lib/data/quote-templates"
import { listServiceOptions } from "@/lib/data/services"
import { todayIso } from "@/lib/dates"
import { templateToQuoteFormValues } from "@/lib/quote-template"

export const metadata = { title: "Novo orçamento" }

export default async function NewQuotePage({ searchParams }) {
  const { cliente, modelo } = await searchParams
  const [user, clients, services, issuer, templates, template] = await Promise.all([
    requireUser(),
    listClientOptions(),
    listServiceOptions(),
    getIssuer(),
    listQuoteTemplateOptions(),
    // "Usar modelo" (?modelo=<id>): getQuoteTemplate só acha modelo da própria conta (senão, null).
    typeof modelo === "string" ? getQuoteTemplate(modelo) : null,
  ])
  // "Criar orçamento" na página do cliente (?cliente=<id>): só vale um cliente da própria lista.
  const initialClientId = clients.find((client) => client.id === cliente)?.id
  const today = todayIso()
  const applied = template && {
    id: template.id,
    name: template.name,
    values: templateToQuoteFormValues(template, { today, clientId: initialClientId }),
  }

  return (
    <>
      <PageHeader
        eyebrow="Orçamentos"
        title="Novo orçamento"
        description={
          applied
            ? "Comece pelo cliente: o resto veio do modelo e pode ser ajustado. O total é atualizado enquanto você preenche."
            : "Monte a proposta por etapas. O total é atualizado enquanto você preenche."
        }
      />
      {/* key: trocar de modelo monta o formulário de novo, com a nova versão de partida. */}
      <QuoteForm
        key={applied?.id ?? "blank"}
        today={today}
        userId={user.id}
        clients={clients}
        services={services}
        issuer={issuer}
        initialClientId={initialClientId}
        templates={templates}
        template={applied}
      />
    </>
  )
}
