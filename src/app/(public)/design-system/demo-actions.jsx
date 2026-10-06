"use client"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"

// Botões interativos da vitrine: disparar toasts.
export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success("Orçamento salvo como rascunho.")}>
        Sucesso
      </Button>
      <Button variant="outline" onClick={() => toast.error("Não foi possível salvar. Tente novamente.")}>
        Erro
      </Button>
      <Button variant="outline" onClick={() => toast.warning("Este orçamento vence amanhã.")}>
        Aviso
      </Button>
      <Button variant="outline" onClick={() => toast.info("Link copiado para a área de transferência.")}>
        Info
      </Button>
    </div>
  )
}
