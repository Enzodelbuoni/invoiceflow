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

// Atividade recente do painel (Sprint 18): os marcos de cada proposta e o que
// o cliente fez. Criar, salvar e os downloads do próprio dono ficam de fora: é
// o que a própria pessoa acabou de fazer, e encheria a lista.
export const ACTIVITY_EVENT_TYPES = Object.freeze([
  "sent",
  "viewed",
  "approved",
  "declined",
  "expired",
  "cancelled",
  "downloaded",
])

export const RECENT_ACTIVITY_LIMIT = 6

/** O evento entra na atividade recente? (download só o do cliente) */
export function isActivityEvent(event) {
  if (!ACTIVITY_EVENT_TYPES.includes(event.type)) return false
  return event.type !== "downloaded" || event.metadata?.by === "client"
}

/**
 * Linhas do banco (evento + proposta + cliente, do mais novo ao mais antigo)
 * → itens da atividade recente. Sem a proposta (não deveria acontecer: o RLS
 * é o mesmo), o item sai.
 * @param {Array<{ id: string, type: string, created_at: string, metadata?: { by?: string }|null,
 *   quote: { id: string, quote_number: string, title: string, client: { name: string }|null }|null }>} rows
 */
export function toActivityItems(rows) {
  return rows
    .filter((row) => row.quote && isActivityEvent(row))
    .map((row) => ({
      id: row.id,
      type: row.type,
      ...(row.metadata?.by ? { by: row.metadata.by } : {}),
      created_at: row.created_at,
      quote: {
        id: row.quote.id,
        number: row.quote.quote_number,
        title: row.quote.title,
        clientName: row.quote.client?.name ?? null,
      },
    }))
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
