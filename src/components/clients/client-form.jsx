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
import { FormSection, TextField, TextareaField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import { formatDocument, formatPhone } from "@/lib/br"
import { clientSchema, toClientFormValues } from "@/lib/validations/client"

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
    defaultValues: toClientFormValues(client),
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
        <TextareaField
          form={form}
          name="notes"
          label="Observações"
          rows={4}
          maxLength={2000}
          placeholder="Preferências, prazos combinados, como conheceu seu trabalho…"
          className="sm:col-span-2"
        />
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
