"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteServiceAction } from "@/actions/services"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"

/**
 * Confirmação de exclusão de serviço. Controlado por `open`/`onOpenChange`.
 * `redirectTo`: para onde ir depois de excluir (ex.: da edição de volta à lista).
 */
export function DeleteServiceDialog({ service, open, onOpenChange, redirectTo }) {
  const router = useRouter()

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Excluir ${service.name}?`}
      description="O serviço sai do seu catálogo. Orçamentos já criados com ele não mudam, porque guardam uma cópia de cada item."
      confirmLabel="Excluir serviço"
      action={() => deleteServiceAction(service.id)}
      onDeleted={() => {
        toast.success("Serviço excluído", { description: service.name })
        if (redirectTo) router.push(redirectTo)
      }}
    />
  )
}
