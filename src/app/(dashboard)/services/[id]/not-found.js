import Link from "next/link"
import { PackageXIcon } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

// Serviço inexistente, excluído ou de outro usuário (o RLS esconde): mesma resposta.
export default function ServiceNotFound() {
  return (
    <EmptyState
      icon={PackageXIcon}
      title="Serviço não encontrado"
      description="Ele pode ter sido excluído, ou o link está incorreto."
    >
      <Button asChild>
        <Link href="/services">Ver todos os serviços</Link>
      </Button>
    </EmptyState>
  )
}
