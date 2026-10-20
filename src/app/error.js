"use client"

import Link from "next/link"
import { CloudAlertIcon } from "lucide-react"

import { ErrorDigest, RetryButton, useReportError } from "@/components/shared/error-fallback"
import { StatusScreen } from "@/components/shared/status-screen"
import { Button } from "@/components/ui/button"

// Erro inesperado fora do painel (telas de entrada, página inicial) ou no
// próprio layout do painel. Dentro do painel vale o (dashboard)/error.js, que
// mantém a sidebar; na proposta pública, o error.js dela.
export default function Error({ error, retry }) {
  useReportError(error)

  return (
    <StatusScreen
      icon={CloudAlertIcon}
      tone="danger"
      title="Algo deu errado"
      description="Não conseguimos carregar esta página agora. Pode ser uma instabilidade momentânea: tente de novo em alguns segundos."
      footer={<ErrorDigest error={error} />}
    >
      <RetryButton retry={retry} size="lg" />
      <Button asChild size="lg" variant="outline" className="h-10 px-4">
        <Link href="/">Página inicial</Link>
      </Button>
    </StatusScreen>
  )
}
