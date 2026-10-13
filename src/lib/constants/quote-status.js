// Status do orçamento. Os valores (em inglês) são os gravados no banco;
// os rótulos (pt-BR) são os exibidos na interface.
export const QUOTE_STATUS = Object.freeze({
  DRAFT: "draft",
  SENT: "sent",
  VIEWED: "viewed",
  APPROVED: "approved",
  DECLINED: "declined",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
})

export const QUOTE_STATUS_VALUES = Object.freeze(Object.values(QUOTE_STATUS))

export const QUOTE_STATUS_LABELS = Object.freeze({
  draft: "Rascunho",
  sent: "Enviado",
  viewed: "Visualizado",
  approved: "Aprovado",
  declined: "Recusado",
  expired: "Expirado",
  cancelled: "Cancelado",
})

// Texto de apoio (tooltip, leitores de tela, filtros).
export const QUOTE_STATUS_DESCRIPTIONS = Object.freeze({
  draft: "Ainda em edição. O cliente não tem acesso.",
  sent: "Enviado ao cliente, aguardando visualização.",
  viewed: "O cliente abriu a proposta.",
  approved: "O cliente aprovou a proposta.",
  declined: "O cliente recusou a proposta.",
  expired: "Passou da data de validade sem resposta.",
  cancelled: "Cancelado. O cliente não pode mais aprovar.",
})

export function isQuoteStatus(value) {
  return QUOTE_STATUS_VALUES.includes(value)
}
