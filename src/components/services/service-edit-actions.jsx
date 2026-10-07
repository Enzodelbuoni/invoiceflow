"use client"

import { useState } from "react"
import { Trash2Icon } from "lucide-react"

import { DeleteServiceDialog } from "@/components/services/delete-service-dialog"
import { Button } from "@/components/ui/button"

/** Botão "Excluir" da página de edição; depois de excluir, volta para a lista. */
export function ServiceEditActions({ service }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <Button variant="outline" className="h-10 text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
        <Trash2Icon data-icon="inline-start" />
        Excluir
      </Button>
      <DeleteServiceDialog service={service} open={confirmOpen} onOpenChange={setConfirmOpen} redirectTo="/services" />
    </>
  )
}
