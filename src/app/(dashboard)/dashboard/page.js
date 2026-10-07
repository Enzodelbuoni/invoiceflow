import Link from "next/link"
import { CircleCheckIcon, FileTextIcon, PercentIcon, PlusIcon, SendIcon, WalletIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ComingSoonButton } from "@/components/shared/coming-soon-button"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { formatLongDate, formatPercent } from "@/lib/format"
import { formatCurrency } from "@/lib/money"
import { cn } from "@/lib/utils"

export const metadata = { title: "Dashboard" }

// TODO(Sprint 18): calcular a partir dos orçamentos do usuário.
const KPIS = [
  {
    label: "Orçamentos enviados",
    value: "0",
    hint: "Nos últimos 30 dias",
    icon: SendIcon,
    tone: "bg-status-sent/10 text-status-sent ring-status-sent/20",
  },
  {
    label: "Aprovados",
    value: "0",
    hint: "Propostas aceitas pelo cliente",
    icon: CircleCheckIcon,
    tone: "bg-status-approved/10 text-status-approved ring-status-approved/20",
  },
  {
    label: "Taxa de conversão",
    value: formatPercent(0),
    hint: "Aprovados ÷ enviados",
    icon: PercentIcon,
    tone: "bg-primary/10 text-primary-ink ring-primary/20",
  },
  {
    label: "Valor aprovado",
    value: formatCurrency(0),
    hint: "Soma das propostas aprovadas",
    icon: WalletIcon,
    tone: "bg-success/10 text-success ring-success/20",
  },
]

function KpiCard({ kpi, index }) {
  const Icon = kpi.icon

  return (
    <div
      className="relative flex animate-enter flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm sm:p-5"
      style={{ animationDelay: `${120 + index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{kpi.label}</p>
        <span
          aria-hidden="true"
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", kpi.tone)}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 font-display text-3xl leading-none tracking-tight sm:text-4xl">{kpi.value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{kpi.hint}</p>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow={formatLongDate(new Date())}
        title="Visão geral"
        description="Acompanhe suas propostas, aprovações e faturamento em um só lugar."
        actions={
          <ComingSoonButton size="lg" message="O construtor de orçamentos chega na Fase 3.">
            <PlusIcon data-icon="inline-start" />
            Novo orçamento
          </ComingSoonButton>
        }
      />

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {KPIS.map((kpi, index) => (
          <KpiCard key={kpi.label} kpi={kpi} index={index} />
        ))}
      </section>

      <EmptyState
        icon={FileTextIcon}
        title="Sua primeira proposta começa aqui"
        description="Cadastre um cliente, adicione seus serviços e monte um orçamento profissional em poucos minutos. O cliente aprova online, direto pelo link."
      >
        <ComingSoonButton message="O construtor de orçamentos chega na Fase 3.">
          <PlusIcon data-icon="inline-start" />
          Criar orçamento
        </ComingSoonButton>
        <Button variant="outline" asChild>
          <Link href="/clients">Ver clientes</Link>
        </Button>
      </EmptyState>
    </>
  )
}
