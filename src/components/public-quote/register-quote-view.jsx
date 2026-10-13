"use client"

import { useEffect } from "react"

import { registerQuoteViewAction } from "@/actions/public-quotes"

/**
 * Registra a visita do cliente DEPOIS que a página carrega no navegador: robôs
 * de prévia de link (WhatsApp, Slack…) buscam só o HTML e não executam
 * JavaScript, então não marcam a proposta como visualizada. O banco ignora
 * repetições e a visita do próprio dono. Não desenha nada.
 */
export function RegisterQuoteView({ publicId }) {
  useEffect(() => {
    registerQuoteViewAction(publicId).catch(() => {
      // Sem conexão: a próxima visita registra.
    })
  }, [publicId])
  return null
}
