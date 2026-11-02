"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createQuoteTemplateAction, updateQuoteTemplateAction } from "@/actions/quote-templates"
import { QuoteAdjustments } from "@/components/quotes/quote-adjustments"
import { QuoteItems } from "@/components/quotes/quote-items"
import { QuoteNotes } from "@/components/quotes/quote-notes"
import { QuotePreviewDialog } from "@/components/quotes/quote-preview-dialog"
import { QuoteSection } from "@/components/quotes/quote-section"
import { QuoteTotalBar } from "@/components/quotes/quote-total-bar"
import { TextField, TextareaField } from "@/components/shared/form-fields"
import { TemplateSummary } from "@/components/templates/template-summary"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useOptionsWithCreated } from "@/hooks/use-options-with-created"
import { isSessionExpired, runAction } from "@/lib/action-client"
import { addDaysIso, formatIsoDateShort } from "@/lib/dates"
import { countErrors, firstErrorPath } from "@/lib/form-errors"
import { preventImplicitSubmit } from "@/lib/form-events"
import { previewQuoteFromForm } from "@/lib/quote-preview"
import { cn } from "@/lib/utils"
import { DEFAULT_VALIDITY_DAYS, QUOTE_LIMITS, VALIDITY_PRESETS } from "@/lib/validations/quote"
import {
  QUOTE_TEMPLATE_LIMITS,
  createEmptyTemplateForm,
  quoteTemplateSchema,
  toTemplateFormValues,
  validityDaysFromInput,
} from "@/lib/validations/quote-template"

// Ordem dos campos na tela, para levar o foco ao primeiro erro (os ids são os nomes).
const FIELD_ORDER = Object.freeze([
  "name",
  "title",
  "description",
  "validity_days",
  { name: "items", fields: ["name", "description", "quantity", "unit", "unit_price"] },
  "discount_value",
  "tax_rate",
  "notes",
  "terms",
])

const PREVIEW_DESCRIPTION =
  "Assim fica uma proposta feita com este modelo. Cliente, número e data entram quando você usar o modelo; nada foi salvo ainda."

/**
 * Validade em dias (o orçamento criado com o modelo vale até hoje + N dias):
 * campo numérico + atalhos (7, 15, 30). Embaixo, o exemplo com a data de hoje.
 */
function ValidityDaysField({ form, today }) {
  const value = useWatch({ control: form.control, name: "validity_days" })
  const error = form.formState.errors.validity_days
  const days = validityDaysFromInput(value)
  const registration = form.register("validity_days")

  function choose(preset) {
    // shouldValidate: sem ele, um erro antigo (ex.: campo vazio) ficaria na tela.
    form.setValue("validity_days", String(preset), { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  return (
    <Field data-invalid={!!error} className="sm:col-span-2">
      <FieldLabel htmlFor="validity_days">Validade da proposta</FieldLabel>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <InputGroup className="h-10 sm:w-36">
          <InputGroupInput
            id="validity_days"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            className="h-full tabular-nums"
            aria-invalid={!!error}
            aria-describedby={error ? "validity_days-error" : "validity_days-hint"}
            {...registration}
            onChange={(event) => {
              // Só dígitos (máscara antes do RHF, como nos outros campos com máscara).
              event.target.value = event.target.value.replace(/\D/g, "").slice(0, 3)
              return registration.onChange(event)
            }}
          />
          <InputGroupAddon align="inline-end">
            <span aria-hidden="true">dias</span>
          </InputGroupAddon>
        </InputGroup>
        <div role="group" aria-label="Atalhos de validade" className="flex gap-1.5">
          {VALIDITY_PRESETS.map((preset) => {
            const active = days === preset
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => choose(preset)}
                className={cn(
                  "h-8 rounded-full border px-3 text-xs font-medium tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-10 max-md:px-4 max-md:text-sm",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary-ink dark:bg-primary/15"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {preset} dias
              </button>
            )
          })}
        </div>
      </div>
      {!error && (
        <FieldDescription id="validity_days-hint">
          {days
            ? `Contada a partir do dia em que o orçamento é criado. Usado hoje, valeria até ${formatIsoDateShort(addDaysIso(today, days))}.`
            : "Por quantos dias o cliente pode aprovar a proposta, contados a partir da criação."}
        </FieldDescription>
      )}
      <FieldError id="validity_days-error" errors={[error]} />
    </Field>
  )
}

/**
 * Editor de modelos de orçamento (etapa 41): as mesmas seções do construtor
 * de orçamentos (itens, desconto/impostos, observações/termos, com as mesmas
 * peças), sem cliente e com a validade em dias. Valida com o
 * quoteTemplateSchema; salvar grava pela Server Action (o banco confere de
 * novo). Com `template`, edita um modelo salvo (conflito se ele mudou em outra
 * aba depois de aberto).
 * Sem cópia local como no construtor: fechar ou recarregar a aba com
 * alterações não salvas pede confirmação ao navegador.
 * @param {{ today: string,
 *   services: Array<{ id: string, name: string, description: string|null, unit: string, price_cents: number }>,
 *   issuer: object, template?: object }} props
 *   `today` ("AAAA-MM-DD") do servidor, para a validade de exemplo e a pré-visualização;
 *   `issuer` (getIssuer) para a pré-visualização; `template` (getQuoteTemplate) na edição.
 */
export function TemplateForm({ today, services, issuer, template }) {
  const editing = Boolean(template)
  const baseValues = useMemo(() => (template ? toTemplateFormValues(template) : createEmptyTemplateForm()), [template])
  const form = useForm({
    resolver: zodResolver(quoteTemplateSchema),
    mode: "onTouched",
    defaultValues: baseValues,
    // O foco no primeiro erro é feito em onInvalid, na ordem da tela.
    shouldFocusError: false,
  })

  // Depois do 1º envio, erros que dependem dos totais são revalidados juntos
  // (mesma regra do construtor de orçamentos).
  const { isSubmitted, isDirty } = form.formState
  useEffect(() => {
    if (!isSubmitted) return
    return form.subscribe({
      formState: { values: true },
      callback: ({ name, type }) => {
        if (type !== "change" || !/^(items|discount_|tax_)/.test(name ?? "")) return
        form.trigger(["items", "discount_value", "tax_rate"])
      },
    })
  }, [form, isSubmitted])

  // Alterações não salvas: o navegador confirma antes de fechar ou recarregar a aba.
  // `saved` (e não o isSubmitSuccessful do RHF, que fica verdadeiro mesmo quando
  // o servidor recusa sem erro de campo, como num conflito).
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (!isDirty || saved) return
    const warn = (event) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty, saved])

  const router = useRouter()
  const [navigating, startNavigation] = useTransition()
  const [serviceOptions, addCreatedService] = useOptionsWithCreated(services)

  async function onValid() {
    const values = form.getValues()
    const result = await runAction(() =>
      editing ? updateQuoteTemplateAction(template.id, template.updated_at, values) : createQuoteTemplateAction(values),
    )
    if (result.offline) {
      toast.error("Não foi possível falar com o servidor", {
        description: "Confira sua conexão e tente de novo. O que você preencheu continua aqui.",
      })
      return
    }
    // Sessão expirada: o aviso com "Entrar novamente" já está na tela, e o formulário continua aqui.
    if (isSessionExpired(result)) return

    if (!result.ok) {
      const fieldErrors = Object.entries(result.fieldErrors ?? {})
      for (const [name, message] of fieldErrors) form.setError(name, { type: "server", message })
      toast.error(result.message)
      const path = firstErrorPath(form.formState.errors, FIELD_ORDER)
      if (path) document.getElementById(path)?.focus()
      return
    }

    setSaved(true)
    toast.success(editing ? "Alterações salvas" : "Modelo criado", {
      description: editing ? result.name : `“${result.name}” já aparece em Novo orçamento.`,
    })
    startNavigation(() => router.push("/templates"))
  }

  function onInvalid(errors) {
    const count = countErrors(errors)
    toast.error("Confira os campos destacados", {
      description: count === 1 ? "1 campo precisa de atenção." : `${count} campos precisam de atenção.`,
    })
    const path = firstErrorPath(errors, FIELD_ORDER)
    if (path) document.getElementById(path)?.focus()
  }

  // Pré-visualização: uma foto do formulário no clique, como um orçamento criado hoje com o modelo.
  const [preview, setPreview] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  function openPreview(triggerId) {
    const values = form.getValues()
    const days = validityDaysFromInput(values.validity_days) ?? DEFAULT_VALIDITY_DAYS
    setPreview({ quote: previewQuoteFromForm({ ...values, valid_until: addDaysIso(today, days) }), triggerId })
    setPreviewOpen(true)
  }
  const saving = form.formState.isSubmitting || navigating

  return (
    // @container: as duas colunas dependem da largura do editor, não da tela.
    <div className="@container">
      <form
        noValidate
        onSubmit={form.handleSubmit(onValid, onInvalid)}
        onKeyDown={preventImplicitSubmit}
        className="grid grid-cols-1 items-start gap-6 @4xl:grid-cols-[minmax(0,1fr)_20rem] @6xl:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <div className="flex min-w-0 flex-col gap-6">
          <QuoteSection id="template-identity" step={1} title="Modelo" description="Como ele aparece para você na lista de modelos.">
            <TextField
              form={form}
              name="name"
              label="Nome do modelo"
              required
              autoComplete="off"
              maxLength={QUOTE_TEMPLATE_LIMITS.nameMax}
              hint="Só você vê. Ex.: Site institucional, Pacote mensal de social media."
              placeholder="Ex.: Site institucional"
            />
          </QuoteSection>

          <QuoteSection
            id="template-info"
            step={2}
            title="Proposta"
            description="O que cada orçamento criado com o modelo já traz preenchido."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                form={form}
                name="title"
                label="Título sugerido"
                autoComplete="off"
                hint="Opcional. Dá para ajustar em cada orçamento, por exemplo com o nome do cliente."
                placeholder="Ex.: Criação de site institucional"
                className="sm:col-span-2"
              />
              <TextareaField
                form={form}
                name="description"
                label="Descrição"
                rows={3}
                maxLength={QUOTE_LIMITS.description}
                hint="Contexto e objetivo do projeto. Aparece no topo da proposta."
                placeholder="Ex.: Novo site com 5 páginas, focado em gerar contatos pelo WhatsApp."
                className="sm:col-span-2"
              />
              <ValidityDaysField form={form} today={today} />
            </div>
          </QuoteSection>

          <QuoteSection
            id="template-items"
            step={3}
            title="Itens"
            description="Opcional. Serviços, quantidades e preços que se repetem nas suas propostas."
          >
            <QuoteItems form={form} services={serviceOptions} onServiceCreated={addCreatedService} noun="modelo" />
          </QuoteSection>

          <QuoteSection id="template-adjustments" step={4} title="Desconto e impostos" description="Opcionais. Entram no total.">
            <QuoteAdjustments form={form} />
          </QuoteSection>

          <QuoteSection
            id="template-notes"
            step={5}
            title="Observações e termos"
            description="Condições que o cliente aceita ao aprovar."
          >
            <QuoteNotes form={form} />
          </QuoteSection>
        </div>

        <TemplateSummary
          control={form.control}
          saving={saving}
          saveLabel={editing ? "Salvar alterações" : "Salvar modelo"}
          onPreview={openPreview}
        />

        {/* Uma coluna só: total + Salvar sempre à mão (some quando o resumo aparece). */}
        <QuoteTotalBar control={form.control} saving={saving} onPreview={() => openPreview("quote-bar-preview")} />
      </form>

      <QuotePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        quote={preview?.quote ?? null}
        client={null}
        issuer={issuer}
        returnFocusId={preview?.triggerId}
        description={PREVIEW_DESCRIPTION}
      />
    </div>
  )
}
