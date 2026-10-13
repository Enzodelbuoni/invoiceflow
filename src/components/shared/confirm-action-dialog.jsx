"use client"

import { useState, useTransition } from "react"

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
 * Confirmação de uma ação importante (enviar, cancelar, excluir…), controlada
 * por `open`/`onOpenChange`. `action()` chama a Server Action e devolve
 * { ok, message? }. Em caso de erro, o diálogo continua aberto e mostra a
 * mensagem; em caso de sucesso, fecha e chama `onDone()` (toast, navegação…).
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, title: string,
 *   description: React.ReactNode, children?: React.ReactNode,
 *   confirmLabel: string, pendingLabel: string, icon?: React.ReactNode,
 *   variant?: "default" | "destructive", cancelLabel?: string,
 *   action: () => Promise<{ ok: boolean, message?: string }>, onDone?: () => void }} props
 *   `children`: conteúdo extra entre a descrição e os botões (ex.: um resumo).
 */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  pendingLabel,
  icon,
  variant = "default",
  cancelLabel = "Cancelar",
  action,
  onDone,
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(null)

  function handleOpenChange(next) {
    if (pending) return
    if (!next) setError(null)
    onOpenChange(next)
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      let result
      try {
        result = await action()
      } catch {
        result = { ok: false, message: "Não foi possível falar com o servidor. Confira sua conexão e tente de novo." }
      }
      if (!result.ok) {
        setError(result.message)
        return
      }
      onOpenChange(false)
      onDone?.()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button variant={variant} onClick={handleConfirm} disabled={pending} aria-busy={pending || undefined}>
            {pending ? <Spinner aria-hidden="true" /> : icon}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
