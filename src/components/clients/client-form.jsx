"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createClientAction, updateClientAction } from "@/actions/clients"
import { FormAlert } from "@/components/auth/form-alert"
import { SubmitButton } from "@/components/auth/submit-button"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDocument, formatPhone } from "@/lib/br"
import { EMPTY_CLIENT_FORM, clientSchema } from "@/lib/validations/client"

/** Seção visual do formulário: título + descrição à esquerda, campos à direita. */
function FormSection({ title, description, children }) {
  return (
    <section className="grid gap-6 border-t py-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** Campo de texto com label, erro ligado por aria-describedby e máscara opcional. */
function TextField({ form, name, label, hint, mask, className, required, ...inputProps }) {
  const error = form.formState.errors[name]
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ") || undefined
  const registration = form.register(name)
  // A máscara é aplicada no próprio evento, ANTES de o RHF ler o valor. (Usar
  // setValue dentro do onChange faz o RHF pular a revalidação daquele campo.)
  const onChange = mask
    ? (event) => {
        event.target.value = mask(event.target.value)
        return registration.onChange(event)
      }
    : registration.onChange

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </FieldLabel>
      <Input id={name} className="h-10" aria-invalid={!!error} aria-required={required || undefined} aria-describedby={describedBy} {...inputProps} {...registration} onChange={onChange} />
      {hint && !error && <FieldDescription id={`${name}-hint`}>{hint}</FieldDescription>}
      <FieldError id={`${name}-error`} errors={[error]} />
    </Field>
  )
}

/** Valores do banco (null, só dígitos) → valores do formulário (strings formatadas). */
export function toFormValues(client) {
  if (!client) return EMPTY_CLIENT_FORM
  return {
    name: client.name ?? "",
    email: client.email ?? "",
    phone: formatPhone(client.phone ?? ""),
    company: client.company ?? "",
    document: formatDocument(client.document ?? ""),
    address: client.address ?? "",
    notes: client.notes ?? "",
  }
}

/**
 * Formulário de cliente (criar ou editar).
 * @param {{ client?: object }} props sem `client` cria; com `client` edita.
 */
export function ClientForm({ client }) {
  const router = useRouter()
  const isEdit = Boolean(client)
  const [formError, setFormError] = useState(null)
  const [navigating, startNavigation] = useTransition()

  const form = useForm({
    resolver: zodResolver(clientSchema),
    mode: "onTouched",
    defaultValues: toFormValues(client),
  })
  const { handleSubmit, setError, formState } = form

  async function onSubmit(values) {
    setFormError(null)
    // A action revalida com o mesmo schema; mandamos os valores crus do formulário.
    const raw = form.getValues()
    const result = isEdit ? await updateClientAction(client.id, raw) : await createClientAction(raw)

    if (!result.ok) {
      setFormError(result.message)
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field, { type: "server", message }, { shouldFocus: true })
      }
      return
    }

    toast.success(isEdit ? "Alterações salvas" : "Cliente cadastrado", { description: values.name })
    startNavigation(() => router.push(isEdit ? `/clients/${client.id}` : "/clients"))
  }

  const busy = formState.isSubmitting || navigating
  const cancelHref = isEdit ? `/clients/${client.id}` : "/clients"

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <FormAlert className="mb-6">{formError}</FormAlert>

      <FormSection title="Contato" description="Quem recebe a proposta e como falar com ele.">
        <TextField form={form} name="name" label="Nome" required autoComplete="off" placeholder="Ex.: Maria Souza ou Estúdio Aurora" className="sm:col-span-2" />
        <TextField form={form} name="email" label="E-mail" type="email" inputMode="email" autoComplete="off" placeholder="contato@empresa.com" />
        <TextField form={form} name="phone" label="Telefone / WhatsApp" type="tel" inputMode="tel" autoComplete="off" placeholder="(11) 91234-5678" mask={formatPhone} />
      </FormSection>

      <FormSection title="Empresa e documento" description="Aparecem no cabeçalho do orçamento.">
        <TextField form={form} name="company" label="Empresa" autoComplete="off" placeholder="Razão social ou nome fantasia" />
        <TextField form={form} name="document" label="CPF ou CNPJ" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" mask={formatDocument} hint="Validamos os dígitos verificadores." />
        <TextField form={form} name="address" label="Endereço" autoComplete="off" placeholder="Rua, número, bairro, cidade/UF" className="sm:col-span-2" />
      </FormSection>

      <FormSection title="Observações" description="Anotações internas. O cliente não vê.">
        <Field data-invalid={!!formState.errors.notes} className="sm:col-span-2">
          <FieldLabel htmlFor="notes">Observações</FieldLabel>
          <Textarea
            id="notes"
            rows={4}
            placeholder="Preferências, prazos combinados, como conheceu seu trabalho…"
            aria-invalid={!!formState.errors.notes}
            aria-describedby={formState.errors.notes ? "notes-error" : undefined}
            {...form.register("notes")}
          />
          <FieldError id="notes-error" errors={[formState.errors.notes]} />
        </Field>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
        <Button variant="outline" asChild className="h-10">
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        <SubmitButton loading={busy} loadingText="Salvando…" className="sm:w-auto sm:px-5">
          {isEdit ? "Salvar alterações" : "Cadastrar cliente"}
        </SubmitButton>
      </div>
    </form>
  )
}
