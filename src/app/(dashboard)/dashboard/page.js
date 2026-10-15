import Link from "next/link"
import { ClockIcon, FileTextIcon, PlusIcon, SendIcon, TrendingUpIcon, WalletIcon } from "lucide-react"

import { ConversionCard } from "@/components/dashboard/conversion-card"
import { KpiTile } from "@/components/dashboard/kpi-tile"
import { PeriodFilter } from "@/components/dashboard/period-filter"
import { StatusBreakdown } from "@/components/dashboard/status-breakdown"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { countLabel, describePeriod, parsePeriod, periodSince } from "@/lib/dashboard"
import { getDashboard } from "@/lib/data/dashboard"
import { formatLongDate } from "@/lib/format"
import { formatCurrency, formatCurrencyCompact } from "@/lib/money"

export const metadata = { title: "Dashboard" }

function NewQuoteButton() {
  return (
    <Button asChild size="lg" className="h-10 px-4">
      <Link href="/quotes/new">
        <PlusIcon data-icon="inline-start" />
        Novo orçamento
      </Link>
    </Button>
  )
}

/** Valor em destaque de um indicador: compacto a partir de R$ 1 milhão, com o exato à mão. */
function money(cents) {
  return { value: formatCurrencyCompact(cents), exactValue: formatCurrency(cents) }
}

/**
 * Painel (Sprint 18): conversão, valores e propostas por situação no período
 * escolhido (?periodo=30d|90d|12m|tudo). Os números vêm de uma função do banco
 * (quote_dashboard); o período conta pela data de envio (o que nunca foi
 * enviado, pela de criação).
 */
export default async function DashboardPage({ searchParams }) {
  const { periodo } = await searchParams
  const period = parsePeriod(periodo)
  const periodText = describePeriod(period)

  const metrics = await getDashboard(periodSince(period))
  // Período vazio: ainda existe alguma proposta? (senão, o convite para a primeira)
  const everything = metrics?.total === 0 && period.days !== null ? await getDashboard(null) : metrics

  const header = (
    <PageHeader
      eyebrow={formatLongDate(new Date())}
      title="Visão geral"
      description="Acompanhe suas propostas, aprovações e faturamento em um só lugar."
      actions={<NewQuoteButton />}
    />
  )

  if (!everything || everything.total === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={FileTextIcon}
          title="Sua primeira proposta começa aqui"
          description="Cadastre um cliente, adicione seus serviços e monte um orçamento profissional em poucos minutos. O cliente aprova online, direto pelo link."
        >
          <Button asChild>
            <Link href="/quotes/new">
              <PlusIcon data-icon="inline-start" />
              Criar orçamento
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/clients">Ver clientes</Link>
          </Button>
        </EmptyState>
      </>
    )
  }

  return (
    <>
      {header}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PeriodFilter current={period.value} />
        <p className="text-xs text-muted-foreground">Pela data de envio (rascunhos, pela de criação).</p>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <ConversionCard metrics={metrics} periodText={periodText} />

        <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:gap-4">
          <KpiTile
            label="Valor aprovado"
            {...money(metrics.approvedValueCents)}
            hint={countLabel(metrics.approved, "proposta aprovada", "propostas aprovadas")}
            icon={WalletIcon}
            tone="bg-success/10 text-success ring-success/20"
          />
          <KpiTile
            label="Valor enviado"
            {...money(metrics.reachedValueCents)}
            hint={countLabel(metrics.reached, "proposta enviada", "propostas enviadas")}
            icon={SendIcon}
            tone="bg-status-sent/10 text-status-sent ring-status-sent/20"
          />
          <KpiTile
            label="Aguardando resposta"
            value={metrics.openCount.toLocaleString("pt-BR")}
            hint={`${formatCurrency(metrics.openValueCents)} em propostas abertas`}
            icon={ClockIcon}
            tone="bg-status-viewed/10 text-status-viewed ring-status-viewed/20"
          />
          <KpiTile
            label="Ticket médio"
            {...(metrics.averageTicketCents === null
              ? { value: "—" }
              : money(metrics.averageTicketCents))}
            hint="Por proposta aprovada"
            icon={TrendingUpIcon}
            tone="bg-primary/10 text-primary-ink ring-primary/20"
          />
        </section>
      </div>

      <StatusBreakdown byStatus={metrics.byStatus} total={metrics.total} periodText={periodText} />
    </>
  )
}
