import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { QUOTE_EVENT_LABELS, summarizeQuoteEvents } from "./quote-events"

const event = (id, type, minute) => ({ id, type, created_at: `2026-10-13T17:${String(minute).padStart(2, "0")}:00Z` })

describe("summarizeQuoteEvents", () => {
  it("do mais novo ao mais antigo", () => {
    expect(summarizeQuoteEvents([event("1", "created", 0), event("2", "sent", 5)]).map((item) => item.type)).toEqual([
      "sent",
      "created",
    ])
  })

  it("salvamentos seguidos viram um item, com a contagem e a data do último", () => {
    const items = summarizeQuoteEvents([
      event("1", "created", 0),
      event("2", "updated", 1),
      event("3", "updated", 2),
      event("4", "updated", 3),
      event("5", "sent", 4),
    ])
    expect(items).toEqual([
      { id: "5", type: "sent", created_at: "2026-10-13T17:04:00Z", count: 1 },
      { id: "2", type: "updated", created_at: "2026-10-13T17:03:00Z", count: 3 },
      { id: "1", type: "created", created_at: "2026-10-13T17:00:00Z", count: 1 },
    ])
  })

  it("salvamentos separados por outro evento continuam separados", () => {
    const types = summarizeQuoteEvents([
      event("1", "updated", 0),
      event("2", "cancelled", 1),
      event("3", "updated", 2),
    ]).map((item) => `${item.type}×${item.count}`)
    expect(types).toEqual(["updated×1", "cancelled×1", "updated×1"])
  })

  it("lista vazia → nada; não altera os eventos recebidos", () => {
    expect(summarizeQuoteEvents([])).toEqual([])
    const events = [event("1", "updated", 0), event("2", "updated", 1)]
    summarizeQuoteEvents(events)
    expect(events[0]).toEqual(event("1", "updated", 0))
  })

  it("os rótulos cobrem exatamente os tipos do CHECK de quote_events.type", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/20261013174559_quote_status_machine.sql", import.meta.url),
      "utf8",
    )
    const list = sql.match(/type in \(([^)]*)\)/)[1]
    const types = [...list.matchAll(/'([a-z]+)'/g)].map((match) => match[1])
    expect(types.length).toBeGreaterThan(5)
    expect(Object.keys(QUOTE_EVENT_LABELS).sort()).toEqual([...types].sort())
  })
})
