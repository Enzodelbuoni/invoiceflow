import Link from "next/link"
import { ArrowRightIcon, FileTextIcon, PlusIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { QUOTE_STATUS_DESCRIPTIONS } from "@/lib/constants/quote-status"

export const metadata = { title: "Orçamentos" }

function Arrow() {
  return <ArrowRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/60" />
}

// Explica o fluxo de status (Sprint 12) enquanto a lista ainda está vazia.
function StatusLifecycle() {
  return (
    <section aria-labelledby="ciclo-titulo" className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 id="ciclo-titulo" className="text-sm font-semibold">
        Como funciona o ciclo de um orçamento
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada proposta passa por estas etapas, e você acompanha tudo em tempo real.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <StatusBadge status="draft" />
        <Arrow />
        <StatusBadge status="sent" />
        <Arrow />
        <StatusBadge status="viewed" />
        <Arrow />
        <span className="flex items-center gap-1.5">
          <StatusBadge status="approved" />
          <span className="text-xs text-muted-foreground">ou</span>
          <StatusBadge status="declined" />
        </span>
      </div>
      <dl className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2.5">
          <dt className="shrink-0">
            <StatusBadge status="expired" size="sm" />
          </dt>
          <dd className="text-muted-foreground">{QUOTE_STATUS_DESCRIPTIONS.expired}</dd>
        </div>
        <div className="flex items-start gap-2.5">
          <dt className="shrink-0">
            <StatusBadge status="cancelled" size="sm" />
          </dt>
          <dd className="text-muted-foreground">{QUOTE_STATUS_DESCRIPTIONS.cancelled}</dd>
        </div>
      </dl>
    </section>
  )
}

export default function QuotesPage() {
  return (
    <>
      <PageHeader
        title="Orçamentos"
        description="Crie, envie e acompanhe suas propostas comerciais."
        actions={
          <Button asChild size="lg" className="h-10 px-4">
            <Link href="/quotes/new">
              <PlusIcon data-icon="inline-start" />
              Novo orçamento
            </Link>
          </Button>
        }
      />

      <EmptyState
        icon={FileTextIcon}
        title="Nenhum orçamento ainda"
        description="Monte propostas com itens, descontos e impostos calculados automaticamente, e envie um link para o cliente aprovar."
      >
        <Button asChild>
          <Link href="/quotes/new">
            <PlusIcon data-icon="inline-start" />
            Criar primeiro orçamento
          </Link>
        </Button>
      </EmptyState>

      <StatusLifecycle />
    </>
  )
}
