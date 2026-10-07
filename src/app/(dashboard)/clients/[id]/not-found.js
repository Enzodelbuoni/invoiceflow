import Link from "next/link"
import { UserXIcon } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

// Cliente inexistente, excluído ou de outro usuário (o RLS esconde): mesma resposta.
export default function ClientNotFound() {
  return (
    <EmptyState
      icon={UserXIcon}
      title="Cliente não encontrado"
      description="Ele pode ter sido excluído, ou o link está incorreto."
    >
      <Button asChild>
        <Link href="/clients">Ver todos os clientes</Link>
      </Button>
    </EmptyState>
  )
}
