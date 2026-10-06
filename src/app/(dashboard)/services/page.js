import { PackageIcon, PlusIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ComingSoonButton } from "@/components/shared/coming-soon-button"
import { EmptyState } from "@/components/shared/empty-state"

export const metadata = { title: "Serviços" }

const NEW_SERVICE_MESSAGE = "O catálogo de serviços chega no Sprint 5."

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Serviços"
        description="Seu catálogo: o que você oferece, a unidade de cobrança e o preço."
        actions={
          <ComingSoonButton size="lg" message={NEW_SERVICE_MESSAGE}>
            <PlusIcon data-icon="inline-start" />
            Novo serviço
          </ComingSoonButton>
        }
      />

      <EmptyState
        icon={PackageIcon}
        title="Nenhum serviço cadastrado"
        description="Cadastre os serviços que você oferece, com unidade e preço, para montar orçamentos em segundos."
      >
        <ComingSoonButton message={NEW_SERVICE_MESSAGE}>
          <PlusIcon data-icon="inline-start" />
          Cadastrar primeiro serviço
        </ComingSoonButton>
      </EmptyState>
    </>
  )
}
