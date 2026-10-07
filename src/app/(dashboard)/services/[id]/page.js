import { redirect } from "next/navigation"

// Serviço não tem página de detalhes (tudo cabe na lista e na edição). Quem
// chegar em /services/[id] (link digitado, histórico) vai direto para a edição.
export default async function ServicePage({ params }) {
  const { id } = await params
  redirect(`/services/${encodeURIComponent(id)}/edit`)
}
