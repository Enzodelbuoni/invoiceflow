"use client"

import { EyeIcon } from "lucide-react"

import { QuotePreview } from "@/components/quotes/quote-preview"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/**
 * Pré-visualização do construtor: o mesmo documento do orçamento salvo, com o
 * que está no formulário agora (nada é validado nem salvo).
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void,
 *   quote: object | null, client: object | null, issuer: { name: string, email?: string|null, phone?: string|null } }} props
 *   `quote` de previewQuoteFromForm; `client` com o que o seletor conhece (nome, empresa, e-mail).
 */
export function QuotePreviewDialog({ open, onOpenChange, quote, client, issuer }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        // Sem DialogTrigger (o diálogo é controlado): o foco volta ao botão "Pré-visualizar".
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          document.getElementById("quote-preview-trigger")?.focus()
        }}
      >
        <DialogHeader className="border-b px-5 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <EyeIcon aria-hidden="true" className="size-4 text-primary-ink" />
            Pré-visualização
          </DialogTitle>
          <DialogDescription>
            Assim o cliente vai ver a proposta. Nada foi salvo ainda; telefone, documento e endereço do cliente entram no
            documento salvo.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto bg-muted/50 px-2 py-4 sm:p-8 dark:bg-muted/30">
          {quote && <QuotePreview quote={quote} client={client} issuer={issuer} label="Prévia" />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
