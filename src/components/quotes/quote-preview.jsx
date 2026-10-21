import { Fragment } from "react"
import { CircleCheckIcon } from "lucide-react"

import { formatDocument, formatPhone } from "@/lib/br"
import { DISCOUNT_TYPE } from "@/lib/constants/discount-types"
import { formatServiceUnit } from "@/lib/constants/service-units"
import { formatIsoDateLong, formatIsoDateShort, formatMoment } from "@/lib/dates"
import { formatShortDate } from "@/lib/format"
import { initials } from "@/lib/initials"
import { formatCurrency } from "@/lib/money"
import { formatPercentValue } from "@/lib/percent"
import { formatQuantity, quantityToNumber } from "@/lib/quantity"
import { cn } from "@/lib/utils"
import { displayWebsite } from "@/lib/website"

// Documento do orçamento (QuotePreview do plano, Sprint 11). Um componente só
// para a visualização interna, a página pública (Sprint 14) e o PDF (Sprint 16):
// recebe os dados já calculados (valores em inteiros, como no banco) e só
// desenha. Sem "use client" e sem estado: funciona como Server Component e
// também dentro do construtor (pré-visualização do que ainda não foi salvo).
// Sempre "papel" claro (.theme-paper), como o cliente recebe e o PDF imprime.
// Container queries (@container): a largura vem do lugar onde ele é mostrado.

/** Centavos → "R$ 1.500,00"; `null` (acima do teto, só na pré-visualização) → "—". */
const money = (cents) => (cents === null || cents === undefined ? "—" : formatCurrency(cents))

/** Data "AAAA-MM-DD" → "28 de out. de 2026"; vazia ou inválida → "—". */
const shortDate = (iso) => formatIsoDateShort(iso) || "—"

/** "1,5 hora", "10 horas", "2 projetos". */
function quantityLabel(item) {
  const unit = formatServiceUnit(item.unit, quantityToNumber(item.quantity_hundredths))
  return `${formatQuantity(item.quantity_hundredths)} ${unit}`.trim()
}

function Eyebrow({ children, className }) {
  return (
    <p className={cn("text-[0.6875rem] font-semibold tracking-[0.16em] text-primary-ink uppercase", className)}>
      {children}
    </p>
  )
}

/** "CNPJ 11.222.333/0001-81" ou "CPF 123.456.789-09". */
const documentLine = (document) => `${document.length === 14 ? "CNPJ" : "CPF"} ${formatDocument(document)}`

/**
 * Quem envia a proposta: iniciais, nome e as linhas de contato, razão social /
 * documento e endereço (as que estiverem preenchidas). Exportado para a prévia
 * de Configurações → Negócio.
 * @param {{ issuer: { name: string, legal_name?: string|null, document?: string|null, email?: string|null,
 *   phone?: string|null, website?: string|null, address?: string|null } }} props
 */
export function IssuerIdentity({ issuer }) {
  // Cada parte é [texto, nowrap]: telefone e documento não quebram no meio; e-mail
  // e site (sem espaços) quebram onde precisar. A quebra cai entre as partes.
  const lines = [
    [
      [issuer.email, false],
      [issuer.phone && formatPhone(issuer.phone), true],
      [issuer.website && displayWebsite(issuer.website), false],
    ],
    [
      [issuer.legal_name, false],
      [issuer.document && documentLine(issuer.document), true],
    ],
  ]
    .map((parts) => parts.filter(([text]) => text))
    .filter((parts) => parts.length > 0)
  return (
    <div className="flex min-w-0 items-start gap-3.5">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold tracking-wide text-primary-foreground"
      >
        {initials(issuer.name)}
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="truncate font-display text-2xl leading-tight">{issuer.name}</p>
        {lines.map((parts) => (
          <p key={parts[0][0]} className="text-sm text-muted-foreground">
            {parts.map(([text, nowrap], index) => (
              <Fragment key={text}>
                {/* Espaço inseparável antes do ponto: a linha nunca começa com "·". */}
                {index > 0 && " · "}
                <span className={nowrap ? "whitespace-nowrap" : "wrap-anywhere"}>{text}</span>
              </Fragment>
            ))}
          </p>
        ))}
        {issuer.address && <p className="text-sm wrap-anywhere text-muted-foreground">{issuer.address}</p>}
      </div>
    </div>
  )
}

function Header({ quote, issuer, label }) {
  const issued = quote.sent_at ?? quote.created_at
  return (
    <header className="flex flex-col gap-6 break-inside-avoid @xl:flex-row @xl:items-start @xl:justify-between">
      <IssuerIdentity issuer={issuer} />

      {/* shrink-0: um endereço longo à esquerda não espreme o número da proposta. */}
      <div className="flex shrink-0 flex-col gap-2 @xl:items-end @xl:text-right">
        <div className="flex items-center gap-2 @xl:flex-row-reverse">
          <Eyebrow>Proposta comercial</Eyebrow>
          {label && (
            <span className="rounded-full border border-dashed border-status-draft/40 px-2 py-px text-[0.6875rem] font-medium text-status-draft">
              {label}
            </span>
          )}
        </div>
        <p className="font-mono text-lg tracking-tight">Nº {quote.quote_number ?? "—"}</p>
        <dl className="grid grid-cols-[auto_auto] justify-start gap-x-3 gap-y-0.5 text-sm @xl:justify-end">
          {issued && (
            <>
              <dt className="text-muted-foreground">Data</dt>
              <dd className="tabular-nums">{formatShortDate(issued)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Válida até</dt>
          <dd className="tabular-nums">{shortDate(quote.valid_until)}</dd>
        </dl>
      </div>
    </header>
  )
}

function ClientCard({ client }) {
  if (!client) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4">
        <Eyebrow>Preparada para</Eyebrow>
        <p className="text-sm text-muted-foreground">Cliente ainda não escolhido.</p>
      </div>
    )
  }
  const lines = [
    client.document && documentLine(client.document),
    client.email,
    client.phone && formatPhone(client.phone),
  ].filter(Boolean)
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border bg-muted/40 p-4">
      <Eyebrow>Preparada para</Eyebrow>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-medium break-words">{client.name}</p>
        {client.company && <p className="text-sm break-words">{client.company}</p>}
        {lines.map((line) => (
          <p key={line} className="text-sm break-words text-muted-foreground">
            {line}
          </p>
        ))}
        {client.address && (
          <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{client.address}</p>
        )}
      </div>
    </div>
  )
}

/** Tamanho do valor em destaque conforme o comprimento (R$ 999.999.999,99 precisa caber). */
function amountSizeClass(text) {
  if (text.length <= 12) return "text-3xl"
  if (text.length <= 15) return "text-2xl"
  return "text-xl"
}

function Highlights({ quote }) {
  const total = money(quote.total_cents)
  return (
    <div className="grid gap-3 @sm:grid-cols-2 @xl:grid-cols-1">
      <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-4">
        <Eyebrow>Investimento</Eyebrow>
        <p className={cn("font-display leading-none whitespace-nowrap tabular-nums", amountSizeClass(total))}>{total}</p>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-4">
        <Eyebrow>Validade</Eyebrow>
        <p className="text-sm leading-snug">{formatIsoDateLong(quote.valid_until) || "—"}</p>
      </div>
    </div>
  )
}

/** Tabela de itens (largura de sobra) ou lista (estreito, ex.: celular). */
function Items({ items }) {
  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <Eyebrow>Itens da proposta</Eyebrow>
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum item adicionado.
        </p>
      </section>
    )
  }
  return (
    <section aria-labelledby="quote-doc-items" className="flex flex-col gap-3">
      <Eyebrow className="break-after-avoid">
        <span id="quote-doc-items">Itens da proposta</span>
      </Eyebrow>

      <table className="hidden w-full border-collapse text-sm @xl:table">
        <caption className="sr-only">Itens da proposta, com quantidade, valor unitário e total</caption>
        <thead>
          <tr className="border-y text-left text-xs text-muted-foreground">
            <th scope="col" className="w-10 py-2.5 pr-2 font-medium">
              #
            </th>
            <th scope="col" className="py-2.5 pr-4 font-medium">
              Descrição
            </th>
            <th scope="col" className="py-2.5 pr-4 text-right font-medium whitespace-nowrap">
              Qtd.
            </th>
            <th scope="col" className="py-2.5 pr-4 text-right font-medium whitespace-nowrap">
              Valor unitário
            </th>
            <th scope="col" className="py-2.5 text-right font-medium">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-b align-top break-inside-avoid">
              <td className="py-3.5 pr-2 font-mono text-xs text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </td>
              <td className="py-3.5 pr-4">
                <p className="font-medium break-words">{item.name}</p>
                {item.description && (
                  <p className="mt-0.5 break-words whitespace-pre-line text-muted-foreground">{item.description}</p>
                )}
              </td>
              <td className="py-3.5 pr-4 text-right whitespace-nowrap tabular-nums">{quantityLabel(item)}</td>
              <td className="py-3.5 pr-4 text-right whitespace-nowrap tabular-nums">
                {money(item.unit_price_cents)}
              </td>
              <td className="py-3.5 text-right font-medium whitespace-nowrap tabular-nums">
                {money(item.subtotal_cents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ol className="flex flex-col border-t @xl:hidden">
        {items.map((item, index) => (
          <li key={index} className="flex flex-col gap-1.5 border-b py-3.5 text-sm break-inside-avoid">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="font-medium break-words">{item.name}</p>
            </div>
            {item.description && (
              <p className="break-words whitespace-pre-line text-muted-foreground">{item.description}</p>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground tabular-nums">
                {quantityLabel(item)} × {money(item.unit_price_cents)}
              </span>
              <span className="font-medium whitespace-nowrap tabular-nums">{money(item.subtotal_cents)}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function TotalRow({ label, value, sign }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">
        {sign && <span className="text-muted-foreground">{sign} </span>}
        {value}
      </dd>
    </div>
  )
}

function Totals({ quote }) {
  const hasDiscount = quote.discount_type && quote.discount_total_cents > 0
  const discountLabel =
    quote.discount_type === DISCOUNT_TYPE.PERCENT ? `Desconto (${formatPercentValue(quote.discount_value)})` : "Desconto"
  return (
    <dl className="ml-auto flex w-full flex-col gap-2 text-sm break-inside-avoid @xl:w-80">
      <TotalRow label="Subtotal" value={money(quote.subtotal_cents)} />
      {hasDiscount && <TotalRow label={discountLabel} sign="−" value={money(quote.discount_total_cents)} />}
      {Boolean(quote.tax_rate_bps) && (
        <TotalRow
          label={`Impostos (${formatPercentValue(quote.tax_rate_bps)})`}
          sign="+"
          value={money(quote.tax_total_cents)}
        />
      )}
      <div className="mt-1 flex items-baseline justify-between gap-6 border-t pt-3">
        <dt className="font-medium">Total</dt>
        <dd className="font-display text-3xl leading-none tabular-nums">{money(quote.total_cents)}</dd>
      </div>
    </dl>
  )
}

function TextBlock({ title, children }) {
  return (
    <section className="flex flex-col gap-2 break-inside-avoid">
      <h3 className="text-sm font-semibold break-after-avoid">{title}</h3>
      <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{children}</p>
    </section>
  )
}

/**
 * Aceite eletrônico (Sprint 15): quem aprovou e quando, com o nome no lugar da
 * assinatura. Fica no documento (página interna, pública e PDF).
 */
function Acceptance({ acceptance }) {
  return (
    <section
      aria-labelledby="quote-doc-acceptance"
      className="flex flex-col gap-5 rounded-lg border border-status-approved/30 bg-status-approved/5 p-5 break-inside-avoid @xl:flex-row @xl:items-end @xl:justify-between @xl:p-6 print:gap-3! print:p-5!"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <Eyebrow>
          <span id="quote-doc-acceptance">Aceite eletrônico</span>
        </Eyebrow>
        <div className="flex min-w-0 flex-col">
          <p className="truncate font-display text-3xl leading-tight italic">{acceptance.signer_name}</p>
          <span aria-hidden="true" className="mt-1 h-px w-full max-w-72 bg-foreground/25" />
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            Aceito eletronicamente em {formatMoment(acceptance.responded_at)} (horário de Brasília).
          </p>
        </div>
      </div>
      <p className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-status-approved">
        <CircleCheckIcon aria-hidden="true" className="size-4" />
        Proposta aprovada
      </p>
    </section>
  )
}

/**
 * O documento do orçamento.
 * @param {{
 *   quote: { quote_number: string|null, status?: string, title: string, description: string|null,
 *     created_at?: string|null, sent_at?: string|null, valid_until: string,
 *     discount_type: "percent"|"amount"|null, discount_value: number|null, tax_rate_bps: number|null,
 *     subtotal_cents: number, discount_total_cents: number, tax_total_cents: number, total_cents: number,
 *     notes: string|null, terms: string|null,
 *     items: Array<{ name: string, description: string|null, quantity_hundredths: number, unit: string,
 *       unit_price_cents: number, subtotal_cents: number }> },
 *   client: { name: string, company?: string|null, email?: string|null, phone?: string|null,
 *     document?: string|null, address?: string|null } | null,
 *   issuer: { name: string, legal_name?: string|null, document?: string|null, email?: string|null,
 *     phone?: string|null, website?: string|null, address?: string|null },
 *   label?: string,
 *   acceptance?: { signer_name: string, responded_at: string } | null,
 *   className?: string,
 * }} props
 *   `label`: selo ao lado de "Proposta comercial" ("Rascunho", "Prévia"), para
 *   ninguém confundir com o documento enviado. `acceptance`: o aceite do
 *   cliente, quando a proposta foi aprovada.
 */
export function QuotePreview({ quote, client, issuer, label, acceptance, className }) {
  return (
    <article
      aria-label={quote.quote_number ? `Proposta Nº ${quote.quote_number}` : "Prévia da proposta"}
      className={cn(
        "theme-paper @container mx-auto w-full max-w-[52rem] overflow-hidden rounded-md shadow-xl ring-1 ring-black/5",
        // Impressão: a folha já é o papel (sem moldura, sombra nem limite de largura).
        "print:max-w-none print:overflow-visible print:rounded-none print:shadow-none print:ring-0",
        className,
      )}
    >
      {/* Faixa da marca no topo (a cor será personalizável no Sprint de identidade visual). */}
      <div aria-hidden="true" className="h-1.5 bg-primary" />

      <div className="flex flex-col gap-9 px-5 py-7 @xl:gap-10 @xl:px-12 @xl:py-12 print:gap-6! print:px-0! print:pt-6! print:pb-0!">
        <Header quote={quote} issuer={issuer} label={label} />

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-[2.125rem] leading-[1.05] tracking-[-0.01em] text-balance break-words @xl:text-[2.75rem]">
            {quote.title}
          </h2>
          {quote.description && (
            <p className="max-w-prose break-words whitespace-pre-line text-muted-foreground">{quote.description}</p>
          )}
        </div>

        <div className="grid gap-3 break-inside-avoid @xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <ClientCard client={client} />
          <Highlights quote={quote} />
        </div>

        <div className="flex flex-col gap-5">
          <Items items={quote.items} />
          <Totals quote={quote} />
        </div>

        {(quote.notes || quote.terms) && (
          <div className="flex flex-col gap-6 border-t pt-8 print:gap-5 print:pt-6">
            {quote.notes && <TextBlock title="Observações">{quote.notes}</TextBlock>}
            {quote.terms && <TextBlock title="Termos e condições">{quote.terms}</TextBlock>}
          </div>
        )}

        {acceptance && <Acceptance acceptance={acceptance} />}

        {/* Na impressão sai o rodapé de cada página (número da proposta e página), e este repetiria o cabeçalho. */}
        <footer className="flex flex-col gap-1 border-t pt-5 text-xs break-inside-avoid text-muted-foreground @xl:flex-row @xl:justify-between print:hidden">
          <p>
            {issuer.name}
            {quote.quote_number && ` · Proposta Nº ${quote.quote_number}`}
          </p>
          <p>Proposta válida até {shortDate(quote.valid_until)}.</p>
        </footer>
      </div>
    </article>
  )
}
