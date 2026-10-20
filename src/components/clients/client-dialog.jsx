"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createClientAction } from "@/actions/clients"
import { FormAlert } from "@/components/auth/form-alert"
import { SubmitButton } from "@/components/auth/submit-button"
import { TextField } from "@/components/shared/form-fields"
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
import { formatDocument, formatPhone } from "@/lib/br"
import { EMPTY_CLIENT_FORM, clientSchema } from "@/lib/validations/client"

/**
 * Formulário enxuto do cadastro rápido. Fica dentro do DialogContent, então é
 * montado de novo a cada abertura (estado limpo, com o nome sugerido).
 */
function QuickClientForm({ defaultName, onCreated, onCancel }) {
  const [formError, setFormError] = useState(null)
  const form = useForm({
    resolver: zodResolver(clientSchema),
    mode: "onTouched",
    defaultValues: { ...EMPTY_CLIENT_FORM, name: defaultName },
  })
  const { handleSubmit, setError, formState } = form

  async function onSubmit(values) {
    setFormError(null)
    // A action revalida com o mesmo schema; mandamos os valores crus do formulário.
    // runAction: sem conexão ou sessão expirada viram aviso (nada do que foi digitado se perde).
    const result = await runAction(() => createClientAction(form.getValues()))
    if (!result.ok) {
      setFormError(result.message)
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field, { type: "server", message }, { shouldFocus: true })
      }
      return
    }
    toast.success("Cliente cadastrado", { description: values.name })
    onCreated({ id: result.id, name: values.name, company: values.company, email: values.email })
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
        <TextField form={form} name="name" label="Nome" required autoComplete="off" placeholder="Ex.: Maria Souza ou Estúdio Aurora" className="sm:col-span-2" />
        <TextField form={form} name="email" label="E-mail" type="email" inputMode="email" autoComplete="off" placeholder="contato@empresa.com" />
        <TextField form={form} name="phone" label="Telefone / WhatsApp" type="tel" inputMode="tel" autoComplete="off" placeholder="(11) 91234-5678" mask={formatPhone} />
        <TextField form={form} name="company" label="Empresa" autoComplete="off" placeholder="Razão social ou nome fantasia" />
        <TextField form={form} name="document" label="CPF ou CNPJ" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" mask={formatDocument} />
      </div>
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" className="h-10" onClick={onCancel} disabled={formState.isSubmitting}>
          Cancelar
        </Button>
        <SubmitButton loading={formState.isSubmitting} loadingText="Salvando…" className="sm:w-auto sm:px-5">
          Cadastrar e selecionar
        </SubmitButton>
      </DialogFooter>
    </form>
  )
}

/**
 * Cadastro rápido de cliente sem sair do orçamento (ClientDialog do plano).
 * Usa o mesmo schema e a mesma Server Action da página de clientes; endereço e
 * observações ficam para depois, na página do cliente.
 * `onCloseAutoFocus`: para onde vai o foco ao fechar (o botão que abriu pode ter sumido).
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, defaultName?: string,
 *   onCreated: (client: { id: string, name: string, company: string|null, email: string|null }) => void,
 *   onCloseAutoFocus?: (event: Event) => void }} props
 */
export function ClientDialog({ open, onOpenChange, defaultName = "", onCreated, onCloseAutoFocus }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 p-6 sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">Novo cliente</DialogTitle>
          <DialogDescription>
            Só o nome é obrigatório. Endereço e observações você completa depois, em Clientes.
          </DialogDescription>
        </DialogHeader>
        <QuickClientForm
          defaultName={defaultName}
          onCancel={() => onOpenChange(false)}
          onCreated={(client) => {
            onCreated(client)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
