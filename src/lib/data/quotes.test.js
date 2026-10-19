import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getDataContext } from "@/lib/data/shared"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import {
  cancelQuote,
  deleteQuote,
  duplicateQuote,
  getQuote,
  getQuoteDocument,
  insertQuote,
  listQuotes,
  sendQuote,
  toCreateQuoteParams,
  updateQuote,
} from "./quotes"

// "server-only" lança erro fora do servidor do Next; aqui ele vira um módulo vazio.
vi.mock("server-only", () => ({}))
// O contexto (usuário + cliente Supabase) é trocado por um falso em cada teste.
vi.mock("@/lib/data/shared", async (importOriginal) => ({ ...(await importOriginal()), getDataContext: vi.fn() }))
vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: vi.fn(() => true) }))

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

describe("updateQuote", () => {
  const ID = "6f1c1d2e-0000-4000-8000-0000000000f1"
  const UPDATED_AT = "2026-10-13T16:41:39.123456+00:00"
  let response
  let rpc

  beforeEach(() => {
    response = { data: { id: ID, quote_number: "2026-001" }, error: null }
    const single = vi.fn(async () => response)
    rpc = vi.fn(() => ({ single }))
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })
  })

  afterEach(() => vi.restoreAllMocks())

  it("chama o update_quote com o id, o updated_at aberto e os totais calculados aqui", async () => {
    await expect(updateQuote(ID, UPDATED_AT, quote())).resolves.toEqual({ id: ID, quote_number: "2026-001" })
    expect(rpc).toHaveBeenCalledWith("update_quote", {
      p_quote_id: ID,
      p_expected_updated_at: UPDATED_AT,
      ...toCreateQuoteParams(quote()),
    })
  })

  it("id inválido → não encontrado, sem ir ao banco", async () => {
    await expect(updateQuote("123", UPDATED_AT, quote())).rejects.toMatchObject({ code: "not_found" })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ["orçamento de outra pessoa ou excluído", { code: "P0002", message: "Orçamento não encontrado." }, "not_found"],
    ["orçamento já enviado", { code: "55000", message: "Só rascunhos podem ser editados." }, "not_editable"],
    ["alterado em outra aba", { code: "PT409", message: "O orçamento foi alterado depois de aberto." }, "conflict"],
  ])("%s → mensagem própria, sem log", async (_, error, code) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    response = { data: null, error }
    await expect(updateQuote(ID, UPDATED_AT, quote())).rejects.toMatchObject({ name: "DataError", code })
    expect(log).not.toHaveBeenCalled()
  })

  it("erro inesperado → mensagem da edição + log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    response = { data: null, error: { code: "23514", message: "O subtotal não confere com a soma dos itens." } }
    await expect(updateQuote(ID, UPDATED_AT, quote())).rejects.toMatchObject({
      code: "write_failed",
      message: "Não foi possível salvar as alterações.",
    })
    expect(log).toHaveBeenCalledOnce()
  })
})

describe("getQuote", () => {
  it("devolve os itens na ordem de position (o join não garante a ordem)", async () => {
    const row = {
      id: "6f1c1d2e-0000-4000-8000-0000000000f2",
      items: [
        { position: 2, name: "C" },
        { position: 0, name: "A" },
        { position: 1, name: "B" },
      ],
    }
    const maybeSingle = vi.fn(async () => ({ data: row, error: null }))
    const builder = { select: () => builder, eq: () => builder, maybeSingle }
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { from: () => builder } })

    const result = await getQuote(row.id)
    expect(result.items.map((item) => item.name)).toEqual(["A", "B", "C"])
  })

  it("id inválido → null, sem ir ao banco", async () => {
    getDataContext.mockClear()
    await expect(getQuote("abc")).resolves.toBeNull()
    expect(getDataContext).not.toHaveBeenCalled()
  })
})

describe("getQuoteDocument", () => {
  function mockRow(row) {
    const maybeSingle = vi.fn(async () => ({ data: row, error: null }))
    const builder = { select: () => builder, eq: () => builder, maybeSingle }
    getDataContext.mockResolvedValue({
      user: { id: "u1", name: "Ana (do cadastro)", email: "ana@exemplo.com" },
      supabase: { from: () => builder },
    })
  }

  it("separa orçamento, cliente e emitente, com os itens em ordem", async () => {
    mockRow({
      id: "6f1c1d2e-0000-4000-8000-0000000000f3",
      quote_number: "2026-001",
      items: [{ position: 1, name: "B" }, { position: 0, name: "A" }],
      client: { name: "Cliente" },
      issuer: { full_name: "Ana Souza", email: "ana@exemplo.com", phone: "11999998888" },
    })
    const { quote, client, issuer } = await getQuoteDocument("6f1c1d2e-0000-4000-8000-0000000000f3")
    expect(quote).not.toHaveProperty("client")
    expect(quote).not.toHaveProperty("issuer")
    expect(quote.items.map((item) => item.name)).toEqual(["A", "B"])
    expect(client).toEqual({ name: "Cliente" })
    expect(issuer).toEqual({ name: "Ana Souza", email: "ana@exemplo.com", phone: "11999998888" })
  })

  it("perfil sem nome: usa o nome de exibição do usuário", async () => {
    mockRow({ id: "x", items: [], client: null, issuer: { full_name: "", email: "ana@exemplo.com", phone: null } })
    const { issuer } = await getQuoteDocument("6f1c1d2e-0000-4000-8000-0000000000f4")
    expect(issuer.name).toBe("Ana (do cadastro)")
  })
})

describe("enviar e cancelar (máquina de estados)", () => {
  const ID = "6f1c1d2e-0000-4000-8000-0000000000f5"
  let rpc

  function mockRpc(error) {
    rpc = vi.fn(async () => ({ data: null, error }))
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })
  }

  afterEach(() => vi.restoreAllMocks())

  it("chamam as funções do banco com o id", async () => {
    mockRpc(null)
    await sendQuote(ID)
    expect(rpc).toHaveBeenCalledWith("send_quote", { p_quote_id: ID })
    await cancelQuote(ID)
    expect(rpc).toHaveBeenCalledWith("cancel_quote", { p_quote_id: ID })
  })

  it.each([
    [sendQuote, { code: "55000" }, "invalid_state", "Este orçamento já foi enviado."],
    [sendQuote, { code: "22023" }, "validity_passed", "A validade deste orçamento já passou. Edite a data antes de enviar."],
    [sendQuote, { code: "P0002" }, "not_found", "Orçamento não encontrado."],
    [cancelQuote, { code: "55000" }, "invalid_state", "Este orçamento não pode mais ser cancelado."],
    [cancelQuote, { code: "28000" }, "unauthenticated", "Sua sessão expirou. Entre novamente."],
  ])("%o + %o → %s", async (fn, error, code, message) => {
    mockRpc(error)
    await expect(fn(ID)).rejects.toMatchObject({ name: "DataError", code, message })
  })

  it("erro inesperado → mensagem genérica + log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    mockRpc({ code: "XX000", message: "falha interna" })
    await expect(sendQuote(ID)).rejects.toMatchObject({ code: "transition_failed", message: "Não foi possível enviar o orçamento." })
    expect(log).toHaveBeenCalledOnce()
  })

  it("id inválido → não encontrado, sem ir ao banco", async () => {
    mockRpc(null)
    await expect(sendQuote("abc")).rejects.toMatchObject({ code: "not_found" })
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe("listQuotes", () => {
  afterEach(() => vi.restoreAllMocks())

  it("chama list_quotes com os filtros (busca vazia → null, data em ISO)", async () => {
    const result = { counts: { draft: 1 }, total: 1, items: [] }
    const rpc = vi.fn(async () => ({ data: result, error: null }))
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })

    await expect(listQuotes()).resolves.toBe(result)
    expect(rpc).toHaveBeenLastCalledWith("list_quotes", {
      p_query: null,
      p_statuses: null,
      p_since: null,
      p_sort: "recent",
      p_limit: 20,
      p_offset: 0,
    })

    const since = new Date("2026-09-19T15:00:00Z")
    await listQuotes({ query: "aurora", statuses: ["sent", "viewed"], since, sort: "value_desc", limit: 20, offset: 40 })
    expect(rpc).toHaveBeenLastCalledWith("list_quotes", {
      p_query: "aurora",
      p_statuses: ["sent", "viewed"],
      p_since: "2026-09-19T15:00:00.000Z",
      p_sort: "value_desc",
      p_limit: 20,
      p_offset: 40,
    })
  })

  it("modo demonstração → lista vazia, sem ir ao banco", async () => {
    isSupabaseConfigured.mockReturnValueOnce(false)
    getDataContext.mockClear()
    await expect(listQuotes()).resolves.toEqual({
      counts: { draft: 0, sent: 0, viewed: 0, approved: 0, declined: 0, expired: 0, cancelled: 0 },
      total: 0,
      items: [],
    })
    expect(getDataContext).not.toHaveBeenCalled()
  })

  it("erro do banco → mensagem amigável + log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const rpc = vi.fn(async () => ({ data: null, error: { code: "42883", message: "function does not exist" } }))
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })
    await expect(listQuotes()).rejects.toMatchObject({ code: "query_failed", message: "Não foi possível carregar os orçamentos." })
    expect(log).toHaveBeenCalledOnce()
  })
})

describe("deleteQuote", () => {
  const ID = "6f1c1d2e-0000-4000-8000-0000000000f6"

  function mockDelete(result) {
    const calls = []
    const builder = {
      delete: () => builder,
      eq: (column, value) => {
        calls.push([column, value])
        return builder
      },
      select: () => builder,
      maybeSingle: vi.fn(async () => result),
    }
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { from: () => builder } })
    return calls
  }

  it("só exclui rascunho do próprio usuário", async () => {
    const calls = mockDelete({ data: { id: ID }, error: null })
    await deleteQuote(ID)
    expect(calls).toEqual([["id", ID], ["user_id", "u1"], ["status", "draft"]])
  })

  it("nada excluído (não é rascunho) → mensagem explicando o cancelamento", async () => {
    mockDelete({ data: null, error: null })
    await expect(deleteQuote(ID)).rejects.toMatchObject({
      code: "not_deletable",
      message: "Só rascunhos podem ser excluídos. Para tirar uma proposta enviada do ar, cancele-a.",
    })
  })
})

describe("duplicateQuote", () => {
  it("lê o original e grava a cópia pelo create_quote, com os totais recalculados", async () => {
    const ID = "6f1c1d2e-0000-4000-8000-0000000000f7"
    const original = {
      id: ID,
      quote_number: "2026-001",
      status: "cancelled",
      created_at: "2026-10-13T13:00:00+00:00",
      ...quote({ valid_until: "2026-10-28" }),
      // totais gravados no original: a cópia não os reaproveita, recalcula
      total_cents: 1,
      items: quote().items.map((item, position) => ({ ...item, position, subtotal_cents: 1 })),
    }
    const maybeSingle = vi.fn(async () => ({ data: original, error: null }))
    const builder = { select: () => builder, eq: () => builder, maybeSingle }
    const single = vi.fn(async () => ({ data: { id: "novo", quote_number: "2026-002" }, error: null }))
    const rpc = vi.fn(() => ({ single }))
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { from: () => builder, rpc } })

    await expect(duplicateQuote(ID)).resolves.toEqual({ id: "novo", quote_number: "2026-002" })
    const [name, params] = rpc.mock.calls[0]
    expect(name).toBe("create_quote")
    expect(params.p_quote).toMatchObject({ client_id: CLIENT, title: "Site institucional", total_cents: 115810 })
    expect(params.p_items.map((item) => item.subtotal_cents)).toEqual([100000, 22550])
  })

  it("original inexistente → não encontrado, sem gravar", async () => {
    const builder = { select: () => builder, eq: () => builder, maybeSingle: vi.fn(async () => ({ data: null, error: null })) }
    const rpc = vi.fn()
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { from: () => builder, rpc } })
    await expect(duplicateQuote("6f1c1d2e-0000-4000-8000-0000000000f8")).rejects.toMatchObject({ code: "not_found" })
    expect(rpc).not.toHaveBeenCalled()
  })
})
