"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { updateProfileAction } from "@/actions/settings"
import { FormAlert } from "@/components/auth/form-alert"
import { SubmitButton } from "@/components/auth/submit-button"
import { FormSection, TextField } from "@/components/shared/form-fields"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { runAction } from "@/lib/action-client"
import { formatPhone } from "@/lib/br"
import { profileSchema, toProfileFormValues } from "@/lib/validations/settings"

/**
 * Configurações → Perfil: nome e telefone (o e-mail de acesso só aparece).
 * @param {{ profile: { full_name: string, email: string|null, phone: string|null } }} props
 */
export function ProfileForm({ profile }) {
  const [formError, setFormError] = useState(null)
  const form = useForm({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    defaultValues: toProfileFormValues(profile),
  })
  const { handleSubmit, setError, formState } = form

  async function onSubmit() {
    setFormError(null)
    const raw = form.getValues()
    const result = await runAction(() => updateProfileAction(raw))
    if (!result.ok) {
      setFormError(result.message)
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field, { type: "server", message }, { shouldFocus: true })
      }
      return
    }
    // Os valores salvos passam a ser o "ponto de partida" do formulário.
    form.reset(raw)
    toast.success("Perfil atualizado")
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
      <FormAlert className="mb-6">{formError}</FormAlert>

      <FormSection title="Seus dados" description="Aparecem no menu e nas propostas, enquanto os dados do negócio estiverem em branco.">
        <TextField form={form} name="full_name" label="Nome" required autoComplete="name" placeholder="Ex.: Ana Souza" className="sm:col-span-2" />
        <TextField form={form} name="phone" label="Telefone / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" mask={formatPhone} />
      </FormSection>

      <FormSection title="Acesso" description="A conta com que você entra no InvoiceFlow.">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="account-email">E-mail de acesso</FieldLabel>
          <Input id="account-email" type="email" value={profile.email ?? ""} readOnly aria-describedby="account-email-hint" className="bg-muted/50 text-muted-foreground" />
          <FieldDescription id="account-email-hint">
            É com ele que você entra. Nas propostas, dá para mostrar outro e-mail em Negócio.
          </FieldDescription>
        </Field>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
        <SubmitButton loading={formState.isSubmitting} loadingText="Salvando…" className="sm:w-auto sm:px-5">
          Salvar perfil
        </SubmitButton>
      </div>
    </form>
  )
}
