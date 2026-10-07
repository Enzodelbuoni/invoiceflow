import Link from "next/link"
import { MailIcon, PhoneIcon, PlusIcon, SearchXIcon, UsersIcon } from "lucide-react"

import { ClientAvatar } from "@/components/clients/client-avatar"
import { ClientRowActions } from "@/components/clients/client-row-actions"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDocument, formatPhone } from "@/lib/br"
import { listClients } from "@/lib/data/clients"
import { formatShortDate } from "@/lib/format"

export const metadata = { title: "Clientes" }

function NewClientButton({ size = "lg" }) {
  return (
    <Button asChild size={size} className="h-10 px-4">
      <Link href="/clients/new">
        <PlusIcon data-icon="inline-start" />
        Novo cliente
      </Link>
    </Button>
  )
}

/** Nome do cliente que cobre a linha/cartão inteiro (o menu de ações fica por cima). */
function ClientLink({ client }) {
  return (
    <Link
      href={`/clients/${client.id}`}
      className="font-medium outline-none after:absolute after:inset-0 after:rounded-[inherit] hover:underline focus-visible:underline"
    >
      {client.name}
    </Link>
  )
}

function ContactInfo({ client }) {
  if (!client.email && !client.phone) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      {client.email && <span className="truncate">{client.email}</span>}
      {client.phone && <span className="text-muted-foreground tabular-nums">{formatPhone(client.phone)}</span>}
    </div>
  )
}

function ClientsTable({ clients }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Cliente</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>CPF / CNPJ</TableHead>
            <TableHead>Cadastrado em</TableHead>
            <TableHead className="w-12 pr-5">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} className="relative">
              <TableCell className="py-3 pl-5">
                <div className="flex items-center gap-3">
                  <ClientAvatar name={client.name} size="sm" />
                  <div className="flex min-w-0 flex-col">
                    <ClientLink client={client} />
                    {client.company && <span className="truncate text-xs text-muted-foreground">{client.company}</span>}
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-64">
                <ContactInfo client={client} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground tabular-nums">
                {client.document ? formatDocument(client.document) : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatShortDate(client.created_at)}</TableCell>
              <TableCell className="relative z-10 pr-5 text-right">
                <ClientRowActions client={client} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// No celular a tabela vira uma lista de cartões.
function ClientsCards({ clients }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {clients.map((client) => (
        <li key={client.id} className="relative flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <ClientAvatar name={client.name} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <ClientLink client={client} />
            {client.company && <span className="truncate text-xs text-muted-foreground">{client.company}</span>}
            <div className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
              {client.email && (
                <span className="flex items-center gap-1.5 truncate">
                  <MailIcon aria-hidden="true" className="size-3.5 shrink-0" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1.5 tabular-nums">
                  <PhoneIcon aria-hidden="true" className="size-3.5 shrink-0" />
                  {formatPhone(client.phone)}
                </span>
              )}
            </div>
          </div>
          <div className="relative z-10 -mt-1 -mr-1">
            <ClientRowActions client={client} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default async function ClientsPage({ searchParams }) {
  const { q } = await searchParams
  const query = typeof q === "string" ? q : ""
  const clients = await listClients({ query })
  const isSearching = Boolean(query.trim())

  // Nenhum cliente cadastrado ainda (e não é uma busca): estado vazio completo.
  if (!isSearching && clients.length === 0) {
    return (
      <>
        <PageHeader
          title="Clientes"
          description="Quem recebe suas propostas: contatos, empresas e histórico de orçamentos."
          actions={<NewClientButton />}
        />
        <EmptyState
          icon={UsersIcon}
          title="Nenhum cliente cadastrado"
          description="Cadastre seus clientes uma vez e reutilize os dados em todos os orçamentos, sem digitar de novo."
        >
          <NewClientButton size="default" />
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Quem recebe suas propostas: contatos, empresas e histórico de orçamentos."
        actions={<NewClientButton />}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput initialQuery={query} label="Buscar clientes" placeholder="Buscar por nome, empresa ou e-mail" />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isSearching
              ? `${clients.length} ${clients.length === 1 ? "resultado" : "resultados"} para “${query.trim()}”`
              : `${clients.length} ${clients.length === 1 ? "cliente" : "clientes"}`}
          </p>
        </div>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
            <SearchXIcon aria-hidden="true" className="size-6 text-muted-foreground" />
            <p className="font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm text-muted-foreground">Tente outro nome, empresa ou e-mail.</p>
          </div>
        ) : (
          <>
            <ClientsTable clients={clients} />
            <ClientsCards clients={clients} />
          </>
        )}
      </div>
    </>
  )
}
