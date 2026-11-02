import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { TemplateEditActions } from "@/components/templates/template-edit-actions"
import { TemplateForm } from "@/components/templates/template-form"
import { getIssuer } from "@/lib/data/profiles"
import { getQuoteTemplate } from "@/lib/data/quote-templates"
import { listServiceOptions } from "@/lib/data/services"
import { todayIso } from "@/lib/dates"

export async function generateMetadata({ params }) {
  const { id } = await params
  const template = await getQuoteTemplate(id)
  return { title: template ? `Editar ${template.name}` : "Modelo não encontrado" }
}

export default async function EditTemplatePage({ params }) {
  const { id } = await params
  const [template, services, issuer] = await Promise.all([getQuoteTemplate(id), listServiceOptions(), getIssuer()])
  if (!template) notFound()

  return (
    <>
      <PageHeader
        eyebrow="Editar modelo"
        title={template.name}
        description="As mudanças valem para os próximos orçamentos. Os já criados com ele não mudam."
        actions={<TemplateEditActions template={{ id: template.id, name: template.name }} />}
      />
      {/* key: depois de salvar e voltar, o editor começa da versão nova. */}
      <TemplateForm key={template.updated_at} today={todayIso()} services={services} issuer={issuer} template={template} />
    </>
  )
}
