import Link from "next/link"
import { PackageIcon, PlusIcon, SearchXIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ServiceRowActions } from "@/components/services/service-row-actions"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatServiceUnit } from "@/lib/constants/service-units"
import { listServices } from "@/lib/data/services"
import { formatShortDate } from "@/lib/format"
import { formatCurrency } from "@/lib/money"

export const metadata = { title: "Serviços" }

const DESCRIPTION = "Seu catálogo: o que você oferece, a unidade de cobrança e o preço."

function NewServiceButton({ size = "lg", children = "Novo serviço" }) {
  return (
    <Button asChild size={size} className="h-10 px-4">
      <Link href="/services/new">
        <PlusIcon data-icon="inline-start" />
        {children}
      </Link>
    </Button>
  )
}

/** Nome do serviço que cobre a linha/cartão inteiro (o menu de ações fica por cima). */
function ServiceLink({ service }) {
  return (
    <Link
      href={`/services/${service.id}/edit`}
      className="font-medium outline-none after:absolute after:inset-0 after:rounded-[inherit] hover:underline focus-visible:underline"
    >
      {service.name}
    </Link>
  )
}

/** "R$ 150,00" com "por hora" embaixo, alinhados à direita. */
function Price({ service }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-medium whitespace-nowrap tabular-nums">{formatCurrency(service.price_cents)}</span>
      <span className="text-xs whitespace-nowrap text-muted-foreground">por {formatServiceUnit(service.unit, 1)}</span>
    </div>
  )
}

function ServicesTable({ services }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Serviço</TableHead>
            <TableHead className="w-40 text-right">Preço</TableHead>
            <TableHead className="w-40 pl-8">Atualizado em</TableHead>
            <TableHead className="w-14 pr-5">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id} className="relative">
              <TableCell className="py-3 pl-5 whitespace-normal">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <ServiceLink service={service} />
                  {service.description && (
                    <span className="truncate text-sm text-muted-foreground">{service.description}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Price service={service} />
              </TableCell>
              <TableCell className="pl-8 text-sm text-muted-foreground">{formatShortDate(service.updated_at)}</TableCell>
              <TableCell className="relative z-10 pr-5 text-right">
                <ServiceRowActions service={service} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// No celular a tabela vira uma lista de cartões.
function ServicesCards({ services }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {services.map((service) => (
        <li key={service.id} className="relative flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <ServiceLink service={service} />
            {service.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
            )}
            <p className="mt-1 text-sm">
              <span className="font-medium tabular-nums">{formatCurrency(service.price_cents)}</span>
              <span className="text-muted-foreground"> por {formatServiceUnit(service.unit, 1)}</span>
            </p>
          </div>
          <div className="relative z-10 -mt-1 -mr-1">
            <ServiceRowActions service={service} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default async function ServicesPage({ searchParams }) {
  const { q } = await searchParams
  const query = typeof q === "string" ? q : ""
  const services = await listServices({ query })
  const isSearching = Boolean(query.trim())

  // Nenhum serviço cadastrado ainda (e não é uma busca): estado vazio completo.
  if (!isSearching && services.length === 0) {
    return (
      <>
        <PageHeader title="Serviços" description={DESCRIPTION} actions={<NewServiceButton />} />
        <EmptyState
          icon={PackageIcon}
          title="Nenhum serviço cadastrado"
          description="Cadastre os serviços que você oferece, com unidade e preço, para montar orçamentos em segundos."
        >
          <NewServiceButton size="default">Cadastrar primeiro serviço</NewServiceButton>
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Serviços" description={DESCRIPTION} actions={<NewServiceButton />} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput initialQuery={query} label="Buscar serviços" placeholder="Buscar por nome ou descrição" />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isSearching
              ? `${services.length} ${services.length === 1 ? "resultado" : "resultados"} para “${query.trim()}”`
              : `${services.length} ${services.length === 1 ? "serviço" : "serviços"}`}
          </p>
        </div>

        {services.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
            <SearchXIcon aria-hidden="true" className="size-6 text-muted-foreground" />
            <p className="font-medium">Nenhum serviço encontrado</p>
            <p className="text-sm text-muted-foreground">Tente outro nome ou uma palavra da descrição.</p>
          </div>
        ) : (
          <>
            <ServicesTable services={services} />
            <ServicesCards services={services} />
          </>
        )}
      </div>
    </>
  )
}
