"use client"

import { useState } from "react"
import Link from "next/link"
import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { DeleteServiceDialog } from "@/components/services/delete-service-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Menu "⋯" de cada serviço na lista: editar e excluir. */
export function ServiceRowActions({ service }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
            <EllipsisIcon />
            <span className="sr-only">Ações para {service.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem asChild>
            <Link href={`/services/${service.id}/edit`}>
              <PencilIcon />
              Editar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2Icon />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteServiceDialog service={service} open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  )
}
