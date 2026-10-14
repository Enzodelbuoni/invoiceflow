"use client"

import { useState } from "react"
import { DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { pdfFileName, quotePdfUrl } from "@/lib/pdf/document"
import { downloadPdf } from "@/lib/pdf-download"
import { cn } from "@/lib/utils"

/**
 * Baixa o PDF da proposta gerado no servidor (Sprint 16). Leva alguns
 * segundos: o botão mostra "Gerando PDF…" e, se der errado, explica num aviso
 * (com a saída "Imprimir" na mensagem).
 */
export function DownloadPdfButton({ publicId, quoteNumber, className, variant = "outline", children = "Baixar PDF" }) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    try {
      await downloadPdf(quotePdfUrl(publicId), pdfFileName(quoteNumber))
    } catch (error) {
      toast.error("Não foi possível baixar o PDF", { description: error.message })
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn("h-9 print:hidden", className)}
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending || undefined}
    >
      {pending ? <Spinner aria-hidden="true" /> : <DownloadIcon data-icon="inline-start" />}
      {pending ? "Gerando PDF…" : children}
    </Button>
  )
}
