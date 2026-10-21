"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { saveBusinessAction } from "@/actions/settings"
import { FormAlert } from "@/components/auth/form-alert"
import { SubmitButton } from "@/components/auth/submit-button"
import { PaperPreview } from "@/components/settings/paper-preview"
import { FormSection, TextField } from "@/components/shared/form-fields"
import { runAction } from "@/lib/action-client"
import { formatDocument, formatPhone } from "@/lib/br"
import { toIssuer } from "@/lib/issuer"
import { businessFromForm, businessSchema, toBusinessFormValues } from "@/lib/validations/settings"

/**
 * Cabeçalho da proposta como ficaria com o que está no formulário agora (com o
 * logo e a cor já salvos em Identidade visual).
 */
function IssuerPreview({ control, profile, branding, fallbackName }) {
  const values = useWatch({ control })
  const issuer = toIssuer({ profile, business: { ...businessFromForm(values), ...branding }, fallbackName })
  return (
    <PaperPreview
      issuer={issuer}
      footnote="Vale para todas as propostas, inclusive as já enviadas: na página que o cliente abre e no PDF."
    />
  )
}

/**
 * Configurações → Negócio: o emitente das propostas. Campo em branco usa o do
 * perfil (nome, e-mail da conta, telefone), e as dicas dizem qual.
 * @param {{ business: object|null, profile: { full_name: string, email: string|null, phone: string|null },
 *   fallbackName: string }} props
 */
export function BusinessForm({ business, profile, fallbackName }) {
  const [formError, setFormError] = useState(null)
  const form = useForm({
    resolver: zodResolver(businessSchema),
    mode: "onTouched",
    defaultValues: toBusinessFormValues(business),
  })
  const { handleSubmit, setError, formState } = form
  const profileName = profile.full_name || fallbackName

  async function onSubmit() {
    setFormError(null)
    const raw = form.getValues()
    const result = await runAction(() => saveBusinessAction(raw))
    if (!result.ok) {
      setFormError(result.message)
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field, { type: "server", message }, { shouldFocus: true })
      }
      return
    }
    form.reset(raw)
    toast.success("Dados do negócio salvos", { description: "As propostas já mostram as alterações." })
  }

  return (
    <div className="@container">
      <div className="grid items-start gap-8 @4xl:grid-cols-[minmax(0,1fr)_20rem]">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
          <FormAlert className="mb-6">{formError}</FormAlert>

          <FormSection title="Identificação" description="Quem assina a proposta, no topo de cada documento.">
            <TextField
              form={form}
              name="name"
              label="Nome nas propostas"
              autoComplete="organization"
              placeholder={profileName}
              hint={`Nome fantasia ou profissional. Em branco, usamos o seu: ${profileName}.`}
              className="sm:col-span-2"
            />
            <TextField form={form} name="legal_name" label="Razão social" autoComplete="off" placeholder="Ex.: Aurora Design Ltda" hint="Se você tem empresa aberta." />
            <TextField form={form} name="document" label="CPF ou CNPJ" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" mask={formatDocument} hint="Validamos os dígitos verificadores." />
            <TextField form={form} name="address" label="Endereço" autoComplete="street-address" placeholder="Rua, número, bairro, cidade/UF" className="sm:col-span-2" />
          </FormSection>

          <FormSection title="Contato" description="Como o cliente fala com você sobre a proposta.">
            <TextField
              form={form}
              name="email"
              label="E-mail de contato"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={profile.email ?? "contato@empresa.com"}
              hint="Em branco, usamos o e-mail da sua conta."
            />
            <TextField
              form={form}
              name="phone"
              label="Telefone / WhatsApp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={profile.phone ? formatPhone(profile.phone) : "(11) 91234-5678"}
              mask={formatPhone}
              hint={profile.phone ? "Em branco, usamos o do seu perfil." : "O cliente pode chamar no WhatsApp pela proposta."}
            />
            <TextField
              form={form}
              name="website"
              label="Site ou rede social"
              inputMode="url"
              autoComplete="url"
              placeholder="meusite.com.br ou instagram.com/seu.perfil"
              className="sm:col-span-2"
            />
          </FormSection>

          <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
            <SubmitButton loading={formState.isSubmitting} loadingText="Salvando…" className="sm:w-auto sm:px-5">
              Salvar dados do negócio
            </SubmitButton>
          </div>
        </form>

        <IssuerPreview
          control={form.control}
          profile={profile}
          branding={{ logo_path: business?.logo_path ?? null, accent_color: business?.accent_color ?? null }}
          fallbackName={fallbackName}
        />
      </div>
    </div>
  )
}
