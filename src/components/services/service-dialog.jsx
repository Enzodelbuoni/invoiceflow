"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createServiceAction } from "@/actions/services"
import { FormAlert } from "@/components/auth/form-alert"
import { SubmitButton } from "@/components/auth/submit-button"
import { CurrencyField, SelectField, TextField, TextareaField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { runAction } from "@/lib/action-client"
import { SERVICE_UNIT_OPTIONS } from "@/lib/constants/service-units"
import { EMPTY_SERVICE_FORM, serviceSchema } from "@/lib/validations/service"

// Os ids levam um prefixo: o construtor de orçamentos, que fica embaixo do
// diálogo, também tem um campo "description".
const ids = (name) => `service-dialog-${name}`

/**
 * Formulário do cadastro rápido. Fica dentro do DialogContent, então é montado
 * de novo a cada abertura (estado limpo, com o nome sugerido).
 */
function QuickServiceForm({ defaultName, onCreated, onCancel }) {
  const [formError, setFormError] = useState(null)
  const form = useForm({
    resolver: zodResolver(serviceSchema),
    mode: "onTouched",
    defaultValues: { ...EMPTY_SERVICE_FORM, name: defaultName },
  })
  const { handleSubmit, setError, formState } = form

  // `values` já vem convertido pelo schema: { name, description, unit, price_cents }.
  async function onSubmit(values) {
    setFormError(null)
    // A action revalida com o mesmo schema; mandamos os valores crus do formulário.
    // runAction: sem conexão ou sessão expirada viram aviso (nada do que foi digitado se perde).
    const result = await runAction(() => createServiceAction(form.getValues()))
    if (!result.ok) {
      setFormError(result.message)
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field, { type: "server", message }, { shouldFocus: true })
      }
      return
    }
    toast.success("Serviço cadastrado", { description: values.name })
    onCreated({ id: result.id, ...values })
  }

  return (
    <form
      noValidate
      // O diálogo é renderizado num portal, mas no React o submit sobe até os
      // ancestrais: sem o stopPropagation, ele também enviaria o formulário do orçamento.
      onSubmit={(event) => {
        event.stopPropagation()
        return handleSubmit(onSubmit)(event)
      }}
      className="grid gap-5"
    >
      <FormAlert>{formError}</FormAlert>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          form={form}
          name="name"
          id={ids("name")}
          label="Nome"
          required
          autoComplete="off"
          placeholder="Ex.: Design de landing page"
          className="sm:col-span-2"
        />
        <CurrencyField form={form} name="price" id={ids("price")} label="Preço" required hint="Em reais, por unidade." />
        <SelectField
          form={form}
          name="unit"
          id={ids("unit")}
          label="Unidade de cobrança"
          required
          options={SERVICE_UNIT_OPTIONS}
        />
        <TextareaField
          form={form}
          name="description"
          id={ids("description")}
          label="Descrição"
          rows={3}
          maxLength={1000}
          placeholder="O que está incluído, entregáveis, número de revisões…"
          className="sm:col-span-2"
        />
      </div>
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" className="h-10" onClick={onCancel} disabled={formState.isSubmitting}>
          Cancelar
        </Button>
        <SubmitButton loading={formState.isSubmitting} loadingText="Salvando…" className="sm:w-auto sm:px-5">
          Cadastrar e adicionar
        </SubmitButton>
      </DialogFooter>
    </form>
  )
}

/**
 * Cadastro rápido de serviço sem sair do orçamento (ServiceDialog do plano).
 * Usa o mesmo schema e a mesma Server Action da página de serviços. O serviço
 * fica salvo no catálogo e entra como item do orçamento.
 * `onCloseAutoFocus`: para onde vai o foco ao fechar (o botão que abriu pode ter sumido).
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, defaultName?: string,
 *   onCreated: (service: { id: string, name: string, description: string|null, unit: string, price_cents: number }) => void,
 *   onCloseAutoFocus?: (event: Event) => void }} props
 */
export function ServiceDialog({ open, onOpenChange, defaultName = "", onCreated, onCloseAutoFocus }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 p-6 sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Novo serviço</DialogTitle>
          <DialogDescription>
            Fica salvo no seu catálogo e já entra como item deste orçamento.
          </DialogDescription>
        </DialogHeader>
        <QuickServiceForm
          defaultName={defaultName}
          onCancel={() => onOpenChange(false)}
          onCreated={(service) => {
            onCreated(service)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
