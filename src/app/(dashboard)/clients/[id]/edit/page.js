import { notFound } from "next/navigation"

import { ClientForm } from "@/components/clients/client-form"
import { PageHeader } from "@/components/layout/page-header"
import { getClient } from "@/lib/data/clients"

export const metadata = { title: "Editar cliente" }

export default async function EditClientPage({ params }) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) notFound()

  return (
    <>
      <PageHeader eyebrow="Editar cliente" title={client.name} />
      <ClientForm client={client} />
    </>
  )
}
