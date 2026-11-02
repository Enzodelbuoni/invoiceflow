"use client"

import { useState } from "react"
import Link from "next/link"
import { EllipsisIcon, FilePlus2Icon, PencilLineIcon, Trash2Icon } from "lucide-react"

import { DeleteTemplateDialog } from "@/components/templates/delete-template-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Menu "⋯" de cada modelo: usar (orçamento novo a partir dele), editar e
 * excluir. Excluído, o cartão some: o foco vai para o resumo da lista.
 * @param {{ template: { id: string, name: string } }} props
 */
export function TemplateActions({ template }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const triggerId = `template-actions-${template.id}`

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button id={triggerId} variant="ghost" size="icon-sm" className="text-muted-foreground max-md:size-10">
            <EllipsisIcon />
            <span className="sr-only">Ações do modelo {template.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem asChild>
            <Link href={`/quotes/new?modelo=${template.id}`}>
              <FilePlus2Icon />
              Novo orçamento com ele
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/templates/${template.id}/edit`}>
              <PencilLineIcon />
              Editar modelo
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2Icon />
            Excluir modelo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteTemplateDialog
        template={template}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onCloseAutoFocus={(event) => {
          const target = document.getElementById(triggerId) ?? document.getElementById("templates-summary")
          if (target) {
            event.preventDefault()
            target.focus()
          }
        }}
      />
    </>
  )
}
