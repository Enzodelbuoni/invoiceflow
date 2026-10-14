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

// "PDF baixado" diz quem baixou (o banco grava metadata.by: "owner" | "client").
export const DOWNLOAD_EVENT_LABELS = Object.freeze({
  owner: "PDF baixado por você",
  client: "PDF baixado pelo cliente",
})

/** Rótulo de um item da linha do tempo (o download diz quem baixou). */
export function quoteEventLabel(item) {
  if (item.type === "downloaded" && DOWNLOAD_EVENT_LABELS[item.by]) return DOWNLOAD_EVENT_LABELS[item.by]
  return QUOTE_EVENT_LABELS[item.type] ?? item.type
}

// Eventos que se repetem em sequência e viram um item só.
const GROUPED_TYPES = new Set(["updated", "downloaded"])

/**
 * Eventos (do mais antigo ao mais novo, como vêm do banco) → itens da linha do
 * tempo, do mais novo ao mais antigo. Salvamentos seguidos (e downloads
 * seguidos do mesmo lado) viram um item só, com `count` e a data do último
 * (editar 10 vezes não enche a lista).
 * @param {Array<{ id: string, type: string, created_at: string, metadata?: { by?: string }|null }>} events
 * @returns {Array<{ id: string, type: string, created_at: string, count: number, by?: string }>}
 */
export function summarizeQuoteEvents(events) {
  const items = []
  for (const event of events) {
    const last = items.at(-1)
    const by = event.metadata?.by
    if (GROUPED_TYPES.has(event.type) && last?.type === event.type && last.by === by) {
      last.count += 1
      last.created_at = event.created_at
      continue
    }
    items.push({ id: event.id, type: event.type, created_at: event.created_at, count: 1, ...(by ? { by } : {}) })
  }
  return items.reverse()
}
