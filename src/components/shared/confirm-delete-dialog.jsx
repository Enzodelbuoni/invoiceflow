"use client"

import { Trash2Icon } from "lucide-react"

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog"

/**
 * Confirmação de exclusão, controlada por `open`/`onOpenChange`.
 * `action()` chama a Server Action e devolve { ok, message? }. Em caso de erro,
 * o diálogo continua aberto e mostra a mensagem; em caso de sucesso, fecha e
 * chama `onDeleted()` (toast, redirecionamento…).
 */
export function ConfirmDeleteDialog({ open, onOpenChange, title, description, confirmLabel, action, onDeleted, onCloseAutoFocus }) {
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      pendingLabel="Excluindo…"
      icon={<Trash2Icon data-icon="inline-start" />}
      variant="destructive"
      action={action}
      onDone={onDeleted}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  )
}
