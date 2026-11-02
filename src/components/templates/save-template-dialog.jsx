"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon, LayoutTemplateIcon } from "lucide-react"
import { toast } from "sonner"

import { saveQuoteAsTemplateAction } from "@/actions/quote-templates"
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
import { QUOTE_TEMPLATE_LIMITS, templateNameSchema } from "@/lib/validations/quote-template"

/** O que vai para o modelo (e o que fica de fora), para não haver surpresa. */
const INCLUDED = ["Itens, quantidades e preços", "Desconto e impostos", "Observações e termos", "Prazo de validade"]

/** Título do orçamento como nome sugerido, cortado no limite do nome do modelo. */
function suggestedName(title) {
  return [...(title ?? "")].slice(0, QUOTE_TEMPLATE_LIMITS.nameMax).join("").trim()
}

/** Formulário do diálogo: montado de novo a cada abertura (estado limpo). */
function SaveTemplateForm({ quote, onSaved, onCancel }) {
  const router = useRouter()
  const [formError, setFormError] = useState(null)
  const form = useForm({
    resolver: zodResolver(templateNameSchema),
    mode: "onTouched",
    defaultValues: { name: suggestedName(quote.title) },
  })
  const { handleSubmit, setError, formState } = form

  async function onSubmit() {
    setFormError(null)
    // runAction: sem conexão ou sessão expirada viram aviso (o nome digitado fica).
    const result = await runAction(() => saveQuoteAsTemplateAction(quote.id, form.getValues()))
    if (!result.ok) {
      const fieldErrors = Object.entries(result.fieldErrors ?? {})
      for (const [field, message] of fieldErrors) setError(field, { type: "server", message }, { shouldFocus: true })
      if (!fieldErrors.length) setFormError(result.message)
      return
    }
    toast.success("Modelo salvo", {
      description: `“${result.name}” já aparece em Novo orçamento.`,
      action: { label: "Ver modelos", onClick: () => router.push("/templates") },
    })
    onSaved()
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.stopPropagation()
        return handleSubmit(onSubmit)(event)
      }}
      className="grid gap-5"
    >
      <FormAlert>{formError}</FormAlert>
      <TextField
        form={form}
        name="name"
        id="template-name"
        label="Nome do modelo"
        hint="Só você vê. Ex.: Site institucional, Pacote mensal de social media."
        required
        autoComplete="off"
        maxLength={QUOTE_TEMPLATE_LIMITS.nameMax}
      />
      <div className="rounded-lg border bg-muted/40 p-3.5 text-sm">
        <p className="font-medium">Vai para o modelo</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {INCLUDED.map((text) => (
            <li key={text} className="flex items-center gap-2 text-muted-foreground">
              <CheckIcon aria-hidden="true" className="size-3.5 shrink-0 text-success" />
              {text}
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-xs text-muted-foreground">O cliente fica de fora: você escolhe ao usar o modelo.</p>
      </div>
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" className="h-10" onClick={onCancel} disabled={formState.isSubmitting}>
          Cancelar
        </Button>
        <SubmitButton loading={formState.isSubmitting} loadingText="Salvando…" className="sm:w-auto sm:px-5">
          Salvar modelo
        </SubmitButton>
      </DialogFooter>
    </form>
  )
}

/**
 * "Salvar como modelo" (etapa 40): guarda o conteúdo do orçamento (itens,
 * desconto, impostos, textos e o prazo de validade) como ponto de partida para
 * novas propostas. Vale para qualquer status; o servidor lê o orçamento.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void,
 *   quote: { id: string, quote_number: string, title: string },
 *   onCloseAutoFocus?: (event: Event) => void }} props
 */
export function SaveTemplateDialog({ open, onOpenChange, quote, onCloseAutoFocus }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 p-6 sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <div
            aria-hidden="true"
            className="mb-1 flex size-10 items-center justify-center rounded-xl border bg-primary/8 text-primary-ink"
          >
            <LayoutTemplateIcon className="size-5" />
          </div>
          <DialogTitle className="font-display text-2xl font-normal">Salvar como modelo</DialogTitle>
          <DialogDescription>
            Reaproveite o orçamento {quote.quote_number} como ponto de partida para as próximas propostas.
          </DialogDescription>
        </DialogHeader>
        <SaveTemplateForm quote={quote} onCancel={() => onOpenChange(false)} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
