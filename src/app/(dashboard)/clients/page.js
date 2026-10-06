import { PlusIcon, UsersIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ComingSoonButton } from "@/components/shared/coming-soon-button"
import { EmptyState } from "@/components/shared/empty-state"

export const metadata = { title: "Clientes" }

const NEW_CLIENT_MESSAGE = "O cadastro de clientes chega no Sprint 4."

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Quem recebe suas propostas: contatos, empresas e histórico de orçamentos."
        actions={
          <ComingSoonButton size="lg" message={NEW_CLIENT_MESSAGE}>
            <PlusIcon data-icon="inline-start" />
            Novo cliente
          </ComingSoonButton>
        }
      />

      <EmptyState
        icon={UsersIcon}
        title="Nenhum cliente cadastrado"
        description="Cadastre seus clientes uma vez e reutilize os dados em todos os orçamentos, sem digitar de novo."
      >
        <ComingSoonButton message={NEW_CLIENT_MESSAGE}>
          <PlusIcon data-icon="inline-start" />
          Cadastrar primeiro cliente
        </ComingSoonButton>
      </EmptyState>
    </>
  )
}
