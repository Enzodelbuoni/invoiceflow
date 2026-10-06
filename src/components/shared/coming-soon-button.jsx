"use client"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/**
 * Botão de uma ação que ainda não foi implementada: avisa com um toast
 * em vez de levar a uma página 404. Substituir pelo link real quando a
 * funcionalidade existir.
 */
export function ComingSoonButton({ message, children, ...props }) {
  return (
    <Button
      {...props}
      onClick={() => toast.info("Em breve", { description: message })}
    >
      {children}
    </Button>
  )
}
