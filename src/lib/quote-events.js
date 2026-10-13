// Linha do tempo do orçamento (tabela quote_events, gravada por gatilho no
// banco a cada criação, edição e mudança de status).

export const QUOTE_EVENT_LABELS = Object.freeze({
  created: "Orçamento criado",
  updated: "Alterações salvas",
  sent: "Enviado ao cliente",
  viewed: "Visualizado pelo cliente",
  approved: "Aprovado pelo cliente",
  declined: "Recusado pelo cliente",
  expired: "Expirou sem resposta",
  cancelled: "Cancelado",
  downloaded: "PDF baixado",
})

/**
 * Eventos (do mais antigo ao mais novo, como vêm do banco) → itens da linha do
 * tempo, do mais novo ao mais antigo. Salvamentos seguidos viram um item só,
 * com `count` e a data do último (editar 10 vezes não enche a lista).
 * @param {Array<{ id: string, type: string, created_at: string }>} events
 * @returns {Array<{ id: string, type: string, created_at: string, count: number }>}
 */
export function summarizeQuoteEvents(events) {
  const items = []
  for (const event of events) {
    const last = items.at(-1)
    if (event.type === "updated" && last?.type === "updated") {
      last.count += 1
      last.created_at = event.created_at
      continue
    }
    items.push({ id: event.id, type: event.type, created_at: event.created_at, count: 1 })
  }
  return items.reverse()
}
