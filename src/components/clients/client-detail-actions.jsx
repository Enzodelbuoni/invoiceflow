"use client"

import { useState } from "react"
import { Trash2Icon } from "lucide-react"

import { DeleteClientDialog } from "@/components/clients/delete-client-dialog"
import { Button } from "@/components/ui/button"

/** Botão "Excluir" da página de detalhes; depois de excluir, volta para a lista. */
export function ClientDetailActions({ client }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <Button variant="outline" className="h-10 text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
        <Trash2Icon data-icon="inline-start" />
        Excluir
      </Button>
      <DeleteClientDialog client={client} open={confirmOpen} onOpenChange={setConfirmOpen} redirectTo="/clients" />
    </>
  )
}
