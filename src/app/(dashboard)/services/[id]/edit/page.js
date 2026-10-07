import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { ServiceEditActions } from "@/components/services/service-edit-actions"
import { ServiceForm } from "@/components/services/service-form"
import { getService } from "@/lib/data/services"

export async function generateMetadata({ params }) {
  const { id } = await params
  const service = await getService(id)
  return { title: service ? `Editar ${service.name}` : "Serviço" }
}

export default async function EditServicePage({ params }) {
  const { id } = await params
  const service = await getService(id)
  if (!service) notFound()

  return (
    <>
      <PageHeader
        eyebrow="Editar serviço"
        title={service.name}
        description="Mudar o preço aqui não altera orçamentos já criados: eles guardam o valor da época."
        actions={<ServiceEditActions service={service} />}
      />
      <ServiceForm service={service} />
    </>
  )
}
