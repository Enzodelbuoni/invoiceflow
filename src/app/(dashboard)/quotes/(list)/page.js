import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRightIcon, FileTextIcon, PlusIcon, SearchXIcon, XIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { QuoteListControls } from "@/components/quotes/quote-list-controls"
import { QuoteListPagination } from "@/components/quotes/quote-list-pagination"
import { QuoteListResults } from "@/components/quotes/quote-list-results"
import { QuoteStatusTabs } from "@/components/quotes/quote-status-tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { QUOTE_STATUS_DESCRIPTIONS } from "@/lib/constants/quote-status"
import { countLabel } from "@/lib/dashboard"
import { listQuotes } from "@/lib/data/quotes"
import { todayIso } from "@/lib/dates"
import { isPdfAvailable } from "@/lib/pdf/render"
import {
  QUOTE_LIST_PERIODS,
  QUOTE_SORTS,
  QUOTE_STATUS_FILTERS,
  clearFiltersHref,
  emptyResultTitle,
  isFiltered,
  pageCount,
  pageRange,
  paginationItems,
  parseQuoteListParams,
  quoteListHref,
  quoteListQuery,
  statusFilterCount,
} from "@/lib/quote-list"

export const metadata = { title: "Orçamentos" }

const DESCRIPTION = "Crie, envie e acompanhe suas propostas comerciais."

function NewQuoteButton({ size = "lg" }) {
  return (
    <Button asChild size={size} className="h-10 px-4">
      <Link href="/quotes/new">
        <PlusIcon data-icon="inline-start" />
        Novo orçamento
      </Link>
    </Button>
  )
}

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

/** "8 orçamentos" / "Mostrando 21–40 de 57 resultados para “aurora”". */
function resultsSummary(params, total) {
  const noun = params.query ? ["resultado", "resultados"] : ["orçamento", "orçamentos"]
  const suffix = params.query ? ` para “${params.query}”` : ""
  if (pageCount(total) === 1) return `${countLabel(total, ...noun)}${suffix}`
  const { from, to } = pageRange(params.page, total)
  return `Mostrando ${from}–${to} de ${countLabel(total, ...noun)}${suffix}`
}

function ClearFiltersLink({ params, className }) {
  return (
    <Button asChild variant="ghost" size="sm" className={className}>
      <Link href={clearFiltersHref(params)} replace scroll={false}>
        <XIcon data-icon="inline-start" />
        Limpar filtros
      </Link>
    </Button>
  )
}

/** Nenhum orçamento com os filtros atuais (o usuário tem outros). */
function NoResults({ params }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
      <SearchXIcon aria-hidden="true" className="size-6 text-muted-foreground" />
      <p className="font-medium text-balance">{emptyResultTitle(params)}</p>
      <p className="text-sm text-muted-foreground">
        {params.query ? "Tente outro número, título ou cliente, ou mude os filtros." : "Mude os filtros para ver outros orçamentos."}
      </p>
      <ClearFiltersLink params={params} className="mt-2" />
    </div>
  )
}

export default async function QuotesPage({ searchParams }) {
  const params = parseQuoteListParams(await searchParams)
  const { counts, total, items } = await listQuotes(quoteListQuery(params))

  // Página que não existe mais (ex.: depois de excluir) → a última que existe.
  const pages = pageCount(total)
  if (params.page > pages) redirect(quoteListHref(params, { page: pages }))

  const header = <PageHeader title="Orçamentos" description={DESCRIPTION} actions={<NewQuoteButton />} />

  // Nenhum orçamento ainda (as contagens ignoram o status; sem busca e sem
  // período, elas são tudo o que o usuário tem): estado vazio + ciclo de status.
  if (!params.query && params.period === QUOTE_LIST_PERIODS[0].value && statusFilterCount(QUOTE_STATUS_FILTERS[0], counts) === 0) {
    return (
      <>
        {header}
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

  // Links prontos para cada aba/opção, com os outros filtros mantidos.
  const tabs = QUOTE_STATUS_FILTERS.map((filter) => ({
    value: filter.value,
    label: filter.label,
    description: filter.description,
    count: statusFilterCount(filter, counts),
    href: quoteListHref(params, { status: filter.value }),
  }))
  const optionsWithHref = (options, key) =>
    options.map((option) => ({ value: option.value, label: option.label, href: quoteListHref(params, { [key]: option.value }) }))
  const pagination = {
    page: params.page,
    pages,
    items: paginationItems(params.page, pages).map((item) =>
      typeof item === "number" ? { key: `p${item}`, page: item, href: quoteListHref(params, { page: item }) } : { key: item },
    ),
    previousHref: params.page > 1 ? quoteListHref(params, { page: params.page - 1 }) : null,
    nextHref: params.page < pages ? quoteListHref(params, { page: params.page + 1 }) : null,
  }

  return (
    <>
      {header}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            initialQuery={params.query}
            label="Buscar orçamentos"
            placeholder="Buscar por número, título ou cliente"
          />
          <QuoteListControls
            period={{ value: params.period, options: optionsWithHref(QUOTE_LIST_PERIODS, "period") }}
            sort={{ value: params.sort, options: optionsWithHref(QUOTE_SORTS, "sort") }}
          />
        </div>

        <QuoteStatusTabs tabs={tabs} current={params.status} />

        <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {/* tabIndex -1: recebe o foco quando a linha de onde ele veio some (orçamento excluído). */}
          <p id="quotes-summary" tabIndex={-1} className="text-sm text-muted-foreground outline-none" aria-live="polite">
            {resultsSummary(params, total)}
          </p>
          {isFiltered(params) && total > 0 && <ClearFiltersLink params={params} className="-mr-2" />}
        </div>

        {items.length === 0 ? (
          <NoResults params={params} />
        ) : (
          <QuoteListResults quotes={items} today={todayIso()} pdfAvailable={isPdfAvailable()} />
        )}

        {pages > 1 && <QuoteListPagination {...pagination} />}
      </div>
    </>
  )
}
