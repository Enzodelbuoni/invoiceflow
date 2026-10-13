import Link from "next/link"
import { FileXIcon } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

// Orçamento inexistente, excluído ou de outro usuário (o RLS esconde): mesma resposta.
export default function QuoteNotFound() {
  return (
    <EmptyState
      icon={FileXIcon}
      title="Orçamento não encontrado"
      description="Ele pode ter sido excluído, ou o link está incorreto."
    >
      <Button asChild>
        <Link href="/quotes">Ver todos os orçamentos</Link>
      </Button>
    </EmptyState>
  )
}
