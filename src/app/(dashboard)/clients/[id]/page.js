import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeftIcon,
  Building2Icon,
  IdCardIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PencilIcon,
  PhoneIcon,
  StickyNoteIcon,
} from "lucide-react"

import { ClientAvatar } from "@/components/clients/client-avatar"
import { ClientDetailActions } from "@/components/clients/client-detail-actions"
import { ClientQuotes } from "@/components/clients/client-quotes"
import { Button } from "@/components/ui/button"
import { formatDocument, formatPhone } from "@/lib/br"
import { getClient } from "@/lib/data/clients"
import { listClientQuotes } from "@/lib/data/quotes"
import { todayIso } from "@/lib/dates"
import { formatShortDate } from "@/lib/format"

export async function generateMetadata({ params }) {
  const { id } = await params
  const client = await getClient(id)
  return { title: client?.name ?? "Cliente" }
}

/** Linha de informação: ícone + rótulo + valor (ou traço quando vazio). */
function InfoItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        {/* wrap-anywhere (e não break-words): um e-mail longo também deixa a coluna encolher no celular. */}
        <dd className="text-sm wrap-anywhere">{children || <span className="text-muted-foreground">Não informado</span>}</dd>
      </div>
    </div>
  )
}

export default async function ClientPage({ params }) {
  const { id } = await params
  const [client, quotes] = await Promise.all([getClient(id), listClientQuotes(id)])
  if (!client) notFound()

  const whatsappUrl = client.phone ? `https://wa.me/55${client.phone}` : null

  return (
    <>
      <div className="flex flex-col gap-6">
        <Link href="/clients" className="-my-2 flex w-fit items-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Clientes
        </Link>
        {/* Os botões descem para a linha de baixo quando não cabem ao lado do nome (celular, sidebar aberta). */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
          <div className="flex min-w-0 flex-[1_1_20rem] items-center gap-4">
            <ClientAvatar name={client.name} size="lg" />
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="font-display text-4xl leading-tight tracking-[-0.01em] text-balance">{client.name}</h1>
              <p className="text-sm text-muted-foreground">
                {client.company ? `${client.company} · ` : ""}Cliente desde {formatShortDate(client.created_at)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" className="h-10">
              <Link href={`/clients/${client.id}/edit`}>
                <PencilIcon data-icon="inline-start" />
                Editar
              </Link>
            </Button>
            <ClientDetailActions client={{ id: client.id, name: client.name }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section aria-labelledby="contato" className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 id="contato" className="mb-5 text-sm font-semibold">
            Contato e dados
          </h2>
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InfoItem icon={MailIcon} label="E-mail">
              {client.email && (
                <a href={`mailto:${client.email}`} className="text-primary-ink hover:underline">
                  {client.email}
                </a>
              )}
            </InfoItem>
            <InfoItem icon={PhoneIcon} label="Telefone">
              {client.phone && (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                  {formatPhone(client.phone)}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-my-2 inline-flex items-center gap-1 py-2 text-xs font-medium text-success hover:underline"
                  >
                    <MessageCircleIcon aria-hidden="true" className="size-3.5" />
                    WhatsApp
                  </a>
                </span>
              )}
            </InfoItem>
            <InfoItem icon={Building2Icon} label="Empresa">
              {client.company}
            </InfoItem>
            <InfoItem icon={IdCardIcon} label={client.document?.length === 14 ? "CNPJ" : "CPF / CNPJ"}>
              {client.document && <span className="tabular-nums">{formatDocument(client.document)}</span>}
            </InfoItem>
            <div className="sm:col-span-2">
              <InfoItem icon={MapPinIcon} label="Endereço">
                {client.address}
              </InfoItem>
            </div>
          </dl>
        </section>

        <section aria-labelledby="observacoes" className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 id="observacoes" className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <StickyNoteIcon aria-hidden="true" className="size-4 text-muted-foreground" />
            Observações
          </h2>
          {client.notes ? (
            <p className="text-sm whitespace-pre-line text-pretty">{client.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma anotação. Use para lembrar preferências e combinados.</p>
          )}
        </section>
      </div>

      <ClientQuotes client={{ id: client.id, name: client.name }} total={quotes.total} quotes={quotes.items} today={todayIso()} />
    </>
  )
}
