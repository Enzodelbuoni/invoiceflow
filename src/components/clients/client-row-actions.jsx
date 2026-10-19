"use client"

import { useState } from "react"
import Link from "next/link"
import { EllipsisIcon, EyeIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { DeleteClientDialog } from "@/components/clients/delete-client-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Menu "⋯" de cada cliente na lista: ver, editar e excluir. */
export function ClientRowActions({ client }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground max-md:size-10">
            <EllipsisIcon />
            <span className="sr-only">Ações para {client.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem asChild>
            <Link href={`/clients/${client.id}`}>
              <EyeIcon />
              Ver detalhes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/clients/${client.id}/edit`}>
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
      <DeleteClientDialog client={client} open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  )
}
