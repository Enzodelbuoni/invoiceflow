"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { deleteClientAction } from "@/actions/clients"
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
 * Confirmação de exclusão. Controlado por `open`/`onOpenChange`.
 * `redirectTo`: para onde ir depois de excluir (ex.: da página de detalhes de volta à lista).
 */
export function DeleteClientDialog({ client, open, onOpenChange, redirectTo }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(null)

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteClientAction(client.id)
      if (!result.ok) {
        setError(result.message)
        return
      }
      toast.success("Cliente excluído", { description: client.name })
      onOpenChange(false)
      if (redirectTo) router.push(redirectTo)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {client.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Os dados de contato deste cliente serão apagados. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
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
            {pending ? "Excluindo…" : "Excluir cliente"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
