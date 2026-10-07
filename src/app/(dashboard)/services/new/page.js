import { PageHeader } from "@/components/layout/page-header"
import { ServiceForm } from "@/components/services/service-form"

export const metadata = { title: "Novo serviço" }

export default function NewServicePage() {
  return (
    <>
      <PageHeader
        eyebrow="Serviços"
        title="Novo serviço"
        description="Cadastre uma vez e use em todos os orçamentos. O preço pode ser ajustado em cada proposta."
      />
      <ServiceForm />
    </>
  )
}
