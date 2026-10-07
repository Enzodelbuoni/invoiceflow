"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createServiceAction, updateServiceAction } from "@/actions/services"
import { FormAlert } from "@/components/auth/form-alert"
import { SubmitButton } from "@/components/auth/submit-button"
import { CurrencyField, FormSection, SelectField, TextField, TextareaField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { SERVICE_UNIT_OPTIONS, formatServiceUnit } from "@/lib/constants/service-units"
import { MAX_PRICE_CENTS, formatCurrency, parseCurrencyInput } from "@/lib/money"
import { serviceSchema, toServiceFormValues } from "@/lib/validations/service"

/** Como o serviço vai aparecer como item de um orçamento, atualizado enquanto se digita. */
function QuoteLinePreview({ control }) {
  const [name, description, unit, price] = useWatch({ control, name: ["name", "description", "unit", "price"] })
  const cents = parseCurrencyInput(price ?? "")
  const hasPrice = cents !== null && cents <= MAX_PRICE_CENTS

  return (
    <figure className="overflow-hidden rounded-xl border bg-background/60 sm:col-span-2">
      <figcaption className="border-b border-dashed px-4 py-2 text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        Prévia no orçamento
      </figcaption>
      <div className="flex items-start justify-between gap-4 px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className={name?.trim() ? "truncate font-medium" : "truncate font-medium text-muted-foreground/60"}>
            {name?.trim() || "Nome do serviço"}
          </p>
          {description?.trim() && (
            <p className="line-clamp-2 text-sm text-pretty whitespace-pre-line text-muted-foreground">{description.trim()}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <p className={hasPrice ? "font-medium tabular-nums" : "font-medium text-muted-foreground/60 tabular-nums"}>
            {formatCurrency(hasPrice ? cents : 0)}
          </p>
          <p className="text-xs text-muted-foreground">por {formatServiceUnit(unit, 1)}</p>
        </div>
      </div>
    </figure>
  )
}

/**
 * Formulário de serviço (criar ou editar).
 * @param {{ service?: object }} props sem `service` cria; com `service` edita.
 */
export function ServiceForm({ service }) {
  const router = useRouter()
  const isEdit = Boolean(service)
  const [formError, setFormError] = useState(null)
  const [navigating, startNavigation] = useTransition()

  const form = useForm({
    resolver: zodResolver(serviceSchema),
    mode: "onTouched",
    defaultValues: toServiceFormValues(service),
  })
  const { handleSubmit, setError, formState } = form

  async function onSubmit(values) {
    setFormError(null)
    // A action revalida com o mesmo schema; mandamos os valores crus do formulário.
    const raw = form.getValues()
    const result = isEdit ? await updateServiceAction(service.id, raw) : await createServiceAction(raw)

    if (!result.ok) {
      setFormError(result.message)
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field, { type: "server", message }, { shouldFocus: true })
      }
      return
    }

    toast.success(isEdit ? "Alterações salvas" : "Serviço cadastrado", { description: values.name })
    startNavigation(() => router.push("/services"))
  }

  const busy = formState.isSubmitting || navigating

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <FormAlert className="mb-6">{formError}</FormAlert>

      <FormSection title="Serviço" description="O que você entrega. Nome e descrição aparecem para o cliente no orçamento.">
        <TextField
          form={form}
          name="name"
          label="Nome"
          required
          autoComplete="off"
          placeholder="Ex.: Design de landing page"
          className="sm:col-span-2"
        />
        <TextareaField
          form={form}
          name="description"
          label="Descrição"
          rows={4}
          maxLength={1000}
          hint="O que está incluído, entregáveis, número de revisões…"
          placeholder="Ex.: Layout responsivo de uma página, com até 2 rodadas de ajustes."
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection
        title="Preço"
        description="Quanto você cobra por unidade. No orçamento, você define a quantidade e pode ajustar o valor."
      >
        <CurrencyField form={form} name="price" label="Preço" required hint="Em reais, por unidade." />
        <SelectField form={form} name="unit" label="Unidade de cobrança" required options={SERVICE_UNIT_OPTIONS} />
        <QuoteLinePreview control={form.control} />
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
        <Button variant="outline" asChild className="h-10">
          <Link href="/services">Cancelar</Link>
        </Button>
        <SubmitButton loading={busy} loadingText="Salvando…" className="sm:w-auto sm:px-5">
          {isEdit ? "Salvar alterações" : "Cadastrar serviço"}
        </SubmitButton>
      </div>
    </form>
  )
}
