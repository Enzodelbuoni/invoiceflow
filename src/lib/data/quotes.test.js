import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getDataContext } from "@/lib/data/shared"
import { insertQuote, toCreateQuoteParams } from "./quotes"

// "server-only" lança erro fora do servidor do Next; aqui ele vira um módulo vazio.
vi.mock("server-only", () => ({}))
// O contexto (usuário + cliente Supabase) é trocado por um falso em cada teste.
vi.mock("@/lib/data/shared", async (importOriginal) => ({ ...(await importOriginal()), getDataContext: vi.fn() }))

const CLIENT = "6f1c1d2e-0000-4000-8000-000000000001"
const SERVICE = "6f1c1d2e-0000-4000-8000-000000000002"

/** Orçamento como sai do createQuoteSchema (o mesmo exemplo conferido à mão na etapa 13). */
const quote = (overrides = {}) => ({
  client_id: CLIENT,
  title: "Site institucional",
  description: null,
  valid_until: "2026-10-27",
  items: [
    { service_id: SERVICE, name: "Landing page", description: null, quantity_hundredths: 200, unit: "project", unit_price_cents: 50000 },
    { service_id: null, name: "Suporte", description: "Ajustes", quantity_hundredths: 150, unit: "hour", unit_price_cents: 15033 },
  ],
  discount_type: "percent",
  discount_value: 1000,
  tax_rate_bps: 500,
  notes: null,
  terms: null,
  ...overrides,
})

describe("toCreateQuoteParams", () => {
  it("calcula os totais no servidor e monta os argumentos do create_quote", () => {
    expect(toCreateQuoteParams(quote())).toEqual({
      p_quote: {
        client_id: CLIENT,
        title: "Site institucional",
        description: null,
        valid_until: "2026-10-27",
        discount_type: "percent",
        discount_value: 1000,
        tax_rate_bps: 500,
        notes: null,
        terms: null,
        // 100000 + 22550 (1,5 × 150,33 = 225,495 → 225,50); −10%; +5% sobre o subtotal com desconto.
        subtotal_cents: 122550,
        discount_total_cents: 12255,
        tax_total_cents: 5515,
        total_cents: 115810,
      },
      p_items: [
        { service_id: SERVICE, name: "Landing page", description: null, quantity_hundredths: 200, unit: "project", unit_price_cents: 50000, subtotal_cents: 100000 },
        { service_id: null, name: "Suporte", description: "Ajustes", quantity_hundredths: 150, unit: "hour", unit_price_cents: 15033, subtotal_cents: 22550 },
      ],
    })
  })

  it("ignora totais que venham junto (só valem os calculados aqui)", () => {
    const { p_quote, p_items } = toCreateQuoteParams(
      quote({
        subtotal_cents: 1,
        total_cents: 1,
        items: [{ service_id: null, name: "Item", description: null, quantity_hundredths: 100, unit: "unit", unit_price_cents: 900, subtotal_cents: 1 }],
      }),
    )
    expect(p_quote).toMatchObject({ subtotal_cents: 900, discount_total_cents: 90, tax_total_cents: 41, total_cents: 851 })
    expect(p_items[0].subtotal_cents).toBe(900)
  })

  it("sem desconto e sem imposto: total = subtotal", () => {
    const { p_quote } = toCreateQuoteParams(quote({ discount_type: null, discount_value: null, tax_rate_bps: null }))
    expect(p_quote).toMatchObject({ subtotal_cents: 122550, discount_total_cents: 0, tax_total_cents: 0, total_cents: 122550 })
  })

  it("desconto fixo maior que o subtotal fica limitado a ele (como o CHECK do banco)", () => {
    const { p_quote } = toCreateQuoteParams(quote({ discount_type: "amount", discount_value: 999999, tax_rate_bps: null }))
    expect(p_quote).toMatchObject({ discount_value: 999999, discount_total_cents: 122550, total_cents: 0 })
  })

  it("valores acima do teto → DataError (o schema já barra antes)", () => {
    const huge = { service_id: null, name: "Item", description: null, quantity_hundredths: 99999999, unit: "unit", unit_price_cents: 9999999999 }
    expect(() => toCreateQuoteParams(quote({ items: [huge] }))).toThrow(
      expect.objectContaining({ name: "DataError", code: "invalid_totals" }),
    )
  })
})

describe("insertQuote", () => {
  let response
  let rpc

  beforeEach(() => {
    response = { data: { id: "q1", quote_number: "2026-001" }, error: null }
    const single = vi.fn(async () => response)
    rpc = vi.fn(() => ({ single }))
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })
  })

  afterEach(() => vi.restoreAllMocks())

  it("chama o create_quote com os totais calculados e devolve id e número", async () => {
    await expect(insertQuote(quote())).resolves.toEqual({ id: "q1", quote_number: "2026-001" })
    expect(rpc).toHaveBeenCalledWith("create_quote", toCreateQuoteParams(quote()))
  })

  it.each([
    [
      "cliente que sumiu",
      { code: "23503", message: 'insert or update on table "quotes" violates foreign key constraint "quotes_client_fkey"' },
      "client_missing",
    ],
    [
      "serviço que sumiu",
      { code: "23503", message: 'insert or update on table "quote_items" violates foreign key constraint "quote_items_service_fkey"' },
      "service_missing",
    ],
    ["sessão inválida", { code: "28000", message: "Sessão inválida." }, "unauthenticated"],
  ])("%s → mensagem própria, sem log", async (_, error, code) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    response = { data: null, error }
    await expect(insertQuote(quote())).rejects.toMatchObject({ name: "DataError", code })
    expect(log).not.toHaveBeenCalled()
  })

  it.each([
    ["totais incoerentes", { code: "23514", message: "O subtotal não confere com a soma dos itens." }],
    ["validade fora do período", { code: "22023", message: "Validade fora do período permitido." }],
    ["falha de rede", { code: "", message: "TypeError: fetch failed" }],
  ])("%s → mensagem genérica + código no log", async (_, error) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    response = { data: null, error }
    await expect(insertQuote(quote())).rejects.toMatchObject({
      name: "DataError",
      code: "write_failed",
      message: "Não foi possível salvar o orçamento.",
    })
    expect(log).toHaveBeenCalledOnce()
  })
})
