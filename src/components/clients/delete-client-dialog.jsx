"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteClientAction } from "@/actions/clients"
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog"

/**
 * Confirmação de exclusão de cliente. Controlado por `open`/`onOpenChange`.
 * `redirectTo`: para onde ir depois de excluir (ex.: da página de detalhes de volta à lista).
 */
export function DeleteClientDialog({ client, open, onOpenChange, redirectTo }) {
  const router = useRouter()

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Excluir ${client.name}?`}
      description="Os dados de contato deste cliente serão apagados. Essa ação não pode ser desfeita."
      confirmLabel="Excluir cliente"
      action={() => deleteClientAction(client.id)}
      onDeleted={() => {
        toast.success("Cliente excluído", { description: client.name })
        if (redirectTo) router.push(redirectTo)
      }}
    />
  )
}
