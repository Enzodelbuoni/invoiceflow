import { ClientForm } from "@/components/clients/client-form"
import { PageHeader } from "@/components/layout/page-header"

export const metadata = { title: "Novo cliente" }

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title="Novo cliente"
        description="Só o nome é obrigatório. O resto você completa quando quiser."
      />
      <ClientForm />
    </>
  )
}
