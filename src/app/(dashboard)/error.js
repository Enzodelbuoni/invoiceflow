"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CloudAlertIcon } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { ErrorDigest, RetryButton, useReportError } from "@/components/shared/error-fallback"
import { Button } from "@/components/ui/button"

// Erro inesperado numa página do painel (ex.: o banco não respondeu): a sidebar
// e o cabeçalho continuam (o error.js não envolve o layout do mesmo segmento);
// só o conteúdo vira o aviso, com "Tentar novamente".
export default function DashboardError({ error, retry }) {
  useReportError(error)
  const pathname = usePathname()

  return (
    <EmptyState
      icon={CloudAlertIcon}
      tone="danger"
      title="Não foi possível carregar esta página"
      description="Pode ser uma instabilidade na conexão com o servidor. Seus dados continuam salvos: tente de novo em alguns segundos."
      footer={<ErrorDigest error={error} />}
    >
      <RetryButton retry={retry} />
      {pathname !== "/dashboard" && (
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href="/dashboard">Ir para o painel</Link>
        </Button>
      )}
    </EmptyState>
  )
}
