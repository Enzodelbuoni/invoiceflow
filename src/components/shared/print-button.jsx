"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Abre a janela de impressão do navegador, onde dá para imprimir ou escolher
 * "Salvar como PDF" (Sprint 16). As páginas definem o que sai no papel com
 * print:hidden; o documento tem estilos próprios de impressão.
 */
export function PrintButton({ className, children = "Imprimir ou salvar PDF", ...props }) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("h-9 print:hidden", className)}
      onClick={() => window.print()}
      {...props}
    >
      <PrinterIcon data-icon="inline-start" />
      {children}
    </Button>
  )
}
