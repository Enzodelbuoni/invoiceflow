import Link from "next/link"
import { LayoutTemplateIcon } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

// Modelo inexistente, excluído ou de outro usuário (o RLS esconde): mesma resposta.
export default function TemplateNotFound() {
  return (
    <EmptyState
      icon={LayoutTemplateIcon}
      title="Modelo não encontrado"
      description="Ele pode ter sido excluído, ou o link está incorreto."
    >
      <Button asChild>
        <Link href="/templates">Ver todos os modelos</Link>
      </Button>
    </EmptyState>
  )
}
