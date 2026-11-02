"use client"

import { useState } from "react"
import { Trash2Icon } from "lucide-react"

import { DeleteTemplateDialog } from "@/components/templates/delete-template-dialog"
import { Button } from "@/components/ui/button"

/** Botão "Excluir" da edição do modelo; depois de excluir, volta para a lista. */
export function TemplateEditActions({ template }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <Button variant="outline" className="h-10 text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
        <Trash2Icon data-icon="inline-start" />
        Excluir
      </Button>
      <DeleteTemplateDialog template={template} open={confirmOpen} onOpenChange={setConfirmOpen} redirectTo="/templates" />
    </>
  )
}
