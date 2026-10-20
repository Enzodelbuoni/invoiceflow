"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence } from "motion/react"
import { toast } from "sonner"

import { createQuoteAction, updateQuoteAction } from "@/actions/quotes"
import { ClientSelector } from "@/components/quotes/client-selector"
import { QuoteAdjustments } from "@/components/quotes/quote-adjustments"
import { QuoteBasicInfo } from "@/components/quotes/quote-basic-info"
import { QuoteDraftBanner, QuoteDraftStatus } from "@/components/quotes/quote-draft"
import { QuoteItems } from "@/components/quotes/quote-items"
import { QuoteNotes } from "@/components/quotes/quote-notes"
import { QuotePreviewDialog } from "@/components/quotes/quote-preview-dialog"
import { QuoteSection } from "@/components/quotes/quote-section"
import { QuoteSummary } from "@/components/quotes/quote-summary"
import { QuoteTotalBar } from "@/components/quotes/quote-total-bar"
import { useQuoteDraft } from "@/hooks/use-quote-draft"
import { countErrors, firstErrorPath } from "@/lib/form-errors"
import { quoteDraftKey } from "@/lib/quote-draft"
import { previewQuoteFromForm } from "@/lib/quote-preview"
import { createEmptyQuoteForm, createQuoteSchema, toQuoteFormValues } from "@/lib/validations/quote"

const byName = (a, b) => a.name.localeCompare(b.name, "pt-BR")

// Ordem dos campos na tela, para levar o foco ao primeiro erro. Os ids dos
// campos são os próprios nomes (o seletor de cliente usa "client_id" no botão
// e o catálogo usa "items" no botão de adicionar).
const FIELD_ORDER = Object.freeze([
  "client_id",
  "title",
  "description",
  "valid_until",
  { name: "items", fields: ["name", "description", "quantity", "unit", "unit_price"] },
  "discount_value",
  "tax_rate",
  "notes",
  "terms",
])

/**
 * Enter num campo de texto não envia o construtor (o envio é só pelo botão):
 * num formulário grande, um Enter sem querer mostraria erros em tudo. Vale só
 * para os campos do próprio formulário: os diálogos de cadastro rápido estão
 * em portais, e o evento chega aqui pela árvore do React, não pela do DOM.
 */
function preventImplicitSubmit(event) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return
  const target = event.target
  if (target instanceof HTMLInputElement && event.currentTarget.contains(target)) event.preventDefault()
}

/**
 * Lista do servidor + registros cadastrados pelos diálogos rápidos. A action
 * revalida a página e a lista do servidor passa a incluí-los, mas até lá eles
 * precisam aparecer (o cliente selecionado, o serviço no catálogo).
 */
function useOptionsWithCreated(options) {
  const [created, setCreated] = useState([])
  const merged = useMemo(() => {
    const known = new Set(options.map((option) => option.id))
    const missing = created.filter((option) => !known.has(option.id))
    return missing.length ? [...options, ...missing].sort(byName) : options
  }, [options, created])
  const addCreated = useCallback((option) => setCreated((current) => [...current, option]), [])
  return [merged, addCreated]
}

/**
 * Construtor de orçamentos: seções numeradas à esquerda e o resumo financeiro
 * fixo à direita quando há espaço; numa coluna só (celular, sidebar aberta numa
 * tela média), o resumo vem depois das seções e uma barra no rodapé
 * (QuoteTotalBar) mantém o total e o "Salvar" à vista.
 * Validação com o schema Zod do orçamento (Sprint 7); salvar grava na conta
 * pela Server Action (Sprint 10), que revalida tudo e calcula os totais no
 * servidor. Uma cópia do que está sendo digitado fica neste navegador
 * (useQuoteDraft), para recuperar o trabalho se a aba fechar ou o salvamento
 * falhar; ela é apagada quando o orçamento é salvo.
 * Com `quote`, edita um rascunho já salvo (mesma tela, valores do banco, uma
 * cópia local própria deste orçamento).
 * @param {{ today: string, userId: string,
 *   clients: Array<{ id: string, name: string, company: string|null, email: string|null }>,
 *   services: Array<{ id: string, name: string, description: string|null, unit: string, price_cents: number }>,
 *   issuer: { name: string, email?: string|null, phone?: string|null },
 *   quote?: { id: string, quote_number: string, created_at: string, updated_at: string },
 *   initialClientId?: string }} props
 *   `today` ("AAAA-MM-DD") calculado no servidor; `userId` separa os rascunhos locais por conta;
 *   `clients` para o seletor; `services` para o catálogo; `issuer` (getIssuer) para a
 *   pré-visualização; `quote` (getQuote) na edição; `initialClientId`: orçamento novo já
 *   com o cliente escolhido (vindo da página do cliente).
 */
export function QuoteForm({ today, userId, clients, services, issuer, quote, initialClientId }) {
  const editing = Boolean(quote)
  const schema = useMemo(() => createQuoteSchema({ today }), [today])
  // Versão de partida: o orçamento em branco ou a versão salva. Memorizada,
  // porque o rascunho local compara cada alteração com ela.
  const baseValues = useMemo(
    () => (quote ? toQuoteFormValues(quote) : createEmptyQuoteForm({ today, clientId: initialClientId })),
    [quote, today, initialClientId],
  )
  const form = useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: baseValues,
    // O foco no primeiro erro é feito em onInvalid, na ordem da tela (o RHF
    // seguiria a ordem de registro dos campos e não sabe focar a lista de itens).
    shouldFocusError: false,
  })

  // Depois do 1º envio, o RHF revalida só o campo que mudou. Mas alguns erros
  // dependem dos totais (desconto > subtotal, teto do item e do total): ao
  // mexer em itens, desconto ou imposto, esses campos são revalidados juntos,
  // para um erro já corrigido por outro campo não ficar na tela.
  const { isSubmitted } = form.formState
  useEffect(() => {
    if (!isSubmitted) return
    // subscribe (e não watch): avisa sem re-renderizar e combina com o compilador do React.
    return form.subscribe({
      formState: { values: true },
      callback: ({ name, type }) => {
        if (type !== "change" || !/^(items|discount_|tax_)/.test(name ?? "")) return
        form.trigger(["items", "discount_value", "tax_rate"])
      },
    })
  }, [form, isSubmitted])

  const router = useRouter()
  const [navigating, startNavigation] = useTransition()
  const [clientOptions, addCreatedClient] = useOptionsWithCreated(clients)
  const [serviceOptions, addCreatedService] = useOptionsWithCreated(services)
  const draftKey = quoteDraftKey(userId, quote?.id)
  const draft = useQuoteDraft({
    form,
    draftKey,
    baseValues,
    baseVersion: quote?.updated_at,
    today,
    clients: clientOptions,
    services: serviceOptions,
  })

  const keptLocally = editing
    ? "As alterações continuam guardadas neste navegador."
    : "O orçamento continua guardado neste navegador."

  async function onValid() {
    // A action revalida com o mesmo schema e calcula os totais no servidor;
    // mandamos os valores crus do formulário.
    let result
    try {
      const values = form.getValues()
      result = editing
        ? await updateQuoteAction(quote.id, quote.updated_at, values)
        : await createQuoteAction(values)
    } catch {
      // Sem resposta do servidor (rede caiu, servidor fora do ar).
      toast.error("Não foi possível falar com o servidor", {
        description: `Confira sua conexão e tente de novo. ${keptLocally}`,
      })
      return
    }

    if (!result.ok) {
      const fieldErrors = Object.entries(result.fieldErrors ?? {})
      for (const [name, message] of fieldErrors) form.setError(name, { type: "server", message })
      toast.error(result.message, {
        description: fieldErrors.length ? undefined : keptLocally,
      })
      const path = firstErrorPath(form.formState.errors, FIELD_ORDER)
      if (path) document.getElementById(path)?.focus()
      return
    }

    // Antes de sair: a desmontagem do construtor gravaria a cópia local de novo.
    draft.forget()
    toast.success(editing ? "Alterações salvas" : "Rascunho salvo", { description: `Orçamento ${result.quoteNumber}` })
    startNavigation(() => router.push(`/quotes/${result.id}`))
  }

  // Pré-visualização: uma foto do formulário no momento do clique (o diálogo é modal).
  // O conteúdo fica depois de fechar, para a animação de saída não piscar vazia.
  // `triggerId`: o botão que abriu (o do resumo ou o da barra do celular), que
  // recebe o foco de volta ao fechar.
  const [preview, setPreview] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  function openPreview(triggerId) {
    const values = form.getValues()
    const client = clientOptions.find((option) => option.id === values.client_id) ?? null
    setPreview({
      quote: previewQuoteFromForm(values, quote ? { quote_number: quote.quote_number, created_at: quote.created_at } : {}),
      client: client && { name: client.name, company: client.company, email: client.email },
      triggerId,
    })
    setPreviewOpen(true)
  }
  const saving = form.formState.isSubmitting || navigating

  function onInvalid(errors) {
    const count = countErrors(errors)
    toast.error("Confira os campos destacados", {
      description: count === 1 ? "1 campo precisa de atenção." : `${count} campos precisam de atenção.`,
    })
    const path = firstErrorPath(errors, FIELD_ORDER)
    if (path) document.getElementById(path)?.focus()
  }

  return (
    // O aviso de rascunho fica fora do <form> (e o AnimatePresence dentro de
    // um <div>, não como filho direto do template.js da área privada).
    // @container: as duas colunas dependem da largura do construtor, não da
    // tela (com a sidebar aberta numa tela de 1024 px, o formulário ficaria
    // espremido ao lado do resumo).
    <div className="@container">
      <AnimatePresence initial={false}>
        {draft.pendingDraft && (
          <QuoteDraftBanner
            key="quote-draft"
            draft={draft.pendingDraft}
            editing={editing}
            clients={clientOptions}
            onRestore={draft.restore}
            onDiscard={draft.discard}
          />
        )}
      </AnimatePresence>

      <form
        noValidate
        onSubmit={form.handleSubmit(onValid, onInvalid)}
        onKeyDown={preventImplicitSubmit}
        className="grid grid-cols-1 items-start gap-6 @4xl:grid-cols-[minmax(0,1fr)_20rem] @6xl:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <div className="flex min-w-0 flex-col gap-6">
          <QuoteSection id="quote-client" step={1} title="Cliente" description="Quem vai receber a proposta.">
            <ClientSelector form={form} clients={clientOptions} onClientCreated={addCreatedClient} />
          </QuoteSection>

          <QuoteSection
            id="quote-info"
            step={2}
            title="Informações"
            description="O que está sendo proposto e até quando vale."
          >
            <QuoteBasicInfo form={form} today={today} />
          </QuoteSection>

          <QuoteSection
            id="quote-items"
            step={3}
            title="Itens"
            description="Serviços, quantidades e preços. O subtotal é calculado automaticamente."
          >
            <QuoteItems form={form} services={serviceOptions} onServiceCreated={addCreatedService} />
          </QuoteSection>

          <QuoteSection id="quote-adjustments" step={4} title="Desconto e impostos" description="Opcionais. Entram no total.">
            <QuoteAdjustments form={form} />
          </QuoteSection>

          <QuoteSection
            id="quote-notes"
            step={5}
            title="Observações e termos"
            description="Condições que o cliente aceita ao aprovar."
          >
            <QuoteNotes form={form} />
          </QuoteSection>
        </div>

        <QuoteSummary
          control={form.control}
          today={today}
          clients={clientOptions}
          saving={saving}
          saveLabel={editing ? "Salvar alterações" : "Salvar rascunho"}
          onPreview={openPreview}
          footer={<QuoteDraftStatus draftKey={draftKey} active={draft.autosaving} />}
        />

        {/* Uma coluna só: total + Salvar sempre à mão (some quando o resumo aparece). */}
        <QuoteTotalBar control={form.control} saving={saving} onPreview={() => openPreview("quote-bar-preview")} />
      </form>

      <QuotePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        quote={preview?.quote ?? null}
        client={preview?.client ?? null}
        issuer={issuer}
        returnFocusId={preview?.triggerId}
      />
    </div>
  )
}
