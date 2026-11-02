"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteQuoteTemplateAction } from "@/actions/quote-templates"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"

/**
 * Confirmação de exclusão de modelo. Controlado por `open`/`onOpenChange`.
 * `redirectTo`: para onde ir depois de excluir (da edição de volta à lista);
 * `onCloseAutoFocus`: para onde vai o foco ao fechar (na lista, o cartão some).
 */
export function DeleteTemplateDialog({ template, open, onOpenChange, redirectTo, onCloseAutoFocus }) {
  const router = useRouter()

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Excluir o modelo ${template.name}?`}
      description="Ele sai da sua lista de modelos. Orçamentos já criados com ele não mudam."
      confirmLabel="Excluir modelo"
      action={() => deleteQuoteTemplateAction(template.id)}
      onDeleted={() => {
        toast.success("Modelo excluído", { description: template.name })
        if (redirectTo) router.push(redirectTo)
      }}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  )
}
