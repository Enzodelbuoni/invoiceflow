"use client"

import { useState, useTransition } from "react"
import { Trash2Icon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/**
 * Confirmação de exclusão, controlada por `open`/`onOpenChange`.
 * `action()` chama a Server Action e devolve { ok, message? }. Em caso de erro,
 * o diálogo continua aberto e mostra a mensagem; em caso de sucesso, fecha e
 * chama `onDeleted()` (toast, redirecionamento…).
 */
export function ConfirmDeleteDialog({ open, onOpenChange, title, description, confirmLabel, action, onDeleted }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(null)

  function handleOpenChange(next) {
    if (pending) return
    if (!next) setError(null)
    onOpenChange(next)
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.message)
        return
      }
      onOpenChange(false)
      onDeleted?.()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={pending} aria-busy={pending || undefined}>
            {pending ? <Spinner aria-hidden="true" /> : <Trash2Icon data-icon="inline-start" />}
            {pending ? "Excluindo…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
