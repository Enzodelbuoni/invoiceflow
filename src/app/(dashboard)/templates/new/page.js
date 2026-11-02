import { PageHeader } from "@/components/layout/page-header"
import { TemplateForm } from "@/components/templates/template-form"
import { getIssuer } from "@/lib/data/profiles"
import { listServiceOptions } from "@/lib/data/services"
import { todayIso } from "@/lib/dates"

export const metadata = { title: "Novo modelo" }

export default async function NewTemplatePage() {
  const [services, issuer] = await Promise.all([listServiceOptions(), getIssuer()])

  return (
    <>
      <PageHeader
        eyebrow="Modelos"
        title="Novo modelo"
        description="Monte uma vez o que se repete nas suas propostas. Ao usar o modelo, você só escolhe o cliente."
      />
      <TemplateForm today={todayIso()} services={services} issuer={issuer} />
    </>
  )
}
