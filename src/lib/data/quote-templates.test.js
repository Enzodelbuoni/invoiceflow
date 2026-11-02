import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getQuote } from "@/lib/data/quotes"
import { getDataContext } from "@/lib/data/shared"
import { isSupabaseConfigured } from "@/lib/supabase/env"

import {
  createTemplateFromQuote,
  deleteQuoteTemplate,
  getQuoteTemplate,
  insertQuoteTemplate,
  listQuoteTemplateOptions,
  updateQuoteTemplate,
} from "./quote-templates"

// "server-only" lança erro fora do servidor do Next; aqui ele vira um módulo vazio.
vi.mock("server-only", () => ({}))
vi.mock("@/lib/data/shared", async (importOriginal) => ({ ...(await importOriginal()), getDataContext: vi.fn() }))
vi.mock("@/lib/data/quotes", () => ({ getQuote: vi.fn() }))
vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: vi.fn(() => true) }))

const ID = "6f1c1d2e-0000-4000-8000-0000000000bb"
const SERVICE = "6f1c1d2e-0000-4000-8000-000000000002"

/** Modelo validado, no formato do banco. */
const template = (overrides = {}) => ({
  name: "Site institucional",
  title: "Criação de site",
  description: null,
  validity_days: 15,
  items: [
    { service_id: SERVICE, name: "Landing page", description: null, quantity_hundredths: 200, unit: "project", unit_price_cents: 50000 },
  ],
  discount_type: null,
  discount_value: null,
  tax_rate_bps: null,
  notes: null,
  terms: "50% na aprovação",
  ...overrides,
})

afterEach(() => vi.restoreAllMocks())

describe("insertQuoteTemplate", () => {
  let response
  let rpc

  beforeEach(() => {
    response = { data: ID, error: null }
    rpc = vi.fn(async () => response)
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })
  })

  it("chama o create_quote_template com os campos e os itens separados", async () => {
    await expect(insertQuoteTemplate(template())).resolves.toBe(ID)
    const { items, ...fields } = template()
    expect(rpc).toHaveBeenCalledWith("create_quote_template", { p_template: fields, p_items: items })
  })

  it.each([
    ["nome repetido", { code: "23505", message: "duplicate key value violates unique constraint" }, "name_taken"],
    [
      "serviço que sumiu",
      { code: "23503", message: 'violates foreign key constraint "quote_template_items_service_fkey"' },
      "service_missing",
    ],
    ["sessão inválida", { code: "28000", message: "Sessão inválida." }, "unauthenticated"],
  ])("%s → mensagem própria, sem log", async (_, error, code) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    response = { data: null, error }
    await expect(insertQuoteTemplate(template())).rejects.toMatchObject({ name: "DataError", code })
    expect(log).not.toHaveBeenCalled()
  })

  it("nome repetido aponta para o campo do nome", async () => {
    response = { data: null, error: { code: "23505", message: "duplicate key" } }
    await expect(insertQuoteTemplate(template())).rejects.toMatchObject({ field: "name" })
  })

  it("erro inesperado → mensagem genérica + código no log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    response = { data: null, error: { code: "23514", message: "check violation" } }
    await expect(insertQuoteTemplate(template())).rejects.toMatchObject({
      code: "write_failed",
      message: "Não foi possível salvar o modelo.",
    })
    expect(log).toHaveBeenCalledOnce()
  })
})

describe("updateQuoteTemplate", () => {
  it("chama o update_quote_template com a versão esperada", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }))
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })
    await updateQuoteTemplate(ID, "2026-11-02T13:00:00+00:00", template())
    const { items, ...fields } = template()
    expect(rpc).toHaveBeenCalledWith("update_quote_template", {
      p_template_id: ID,
      p_expected_updated_at: "2026-11-02T13:00:00+00:00",
      p_template: fields,
      p_items: items,
    })
  })

  it.each([
    ["conflito de versão", "PT409", "conflict"],
    ["modelo que sumiu", "P0002", "not_found"],
  ])("%s", async (_, sqlstate, code) => {
    const rpc = vi.fn(async () => ({ data: null, error: { code: sqlstate, message: "" } }))
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })
    await expect(updateQuoteTemplate(ID, "2026-11-02T13:00:00+00:00", template())).rejects.toMatchObject({ code })
  })

  it("id inválido → não encontrado, sem ir ao banco", async () => {
    getDataContext.mockClear()
    await expect(updateQuoteTemplate("abc", "x", template())).rejects.toMatchObject({ code: "not_found" })
    expect(getDataContext).not.toHaveBeenCalled()
  })
})

describe("leitura", () => {
  /** Construtor de consulta falso: `select/eq/order` encadeiam; o fim devolve `result`. */
  function mockQuery(result) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: async () => result,
      maybeSingle: async () => result,
    }
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { from: () => builder } })
  }

  it("opções do seletor: nome, título, quantos itens e o total estimado", async () => {
    mockQuery({
      data: [
        {
          id: ID,
          name: "Site",
          title: null,
          validity_days: 15,
          discount_type: "percent",
          discount_value: 1000,
          tax_rate_bps: 500,
          items: [
            { position: 1, quantity_hundredths: 150, unit_price_cents: 15033 },
            { position: 0, quantity_hundredths: 200, unit_price_cents: 50000 },
          ],
        },
      ],
      error: null,
    })
    await expect(listQuoteTemplateOptions()).resolves.toEqual([
      { id: ID, name: "Site", title: null, itemCount: 2, totalCents: 115810 },
    ])
  })

  it("modo demonstração → sem modelos, sem ir ao banco", async () => {
    isSupabaseConfigured.mockReturnValueOnce(false)
    getDataContext.mockClear()
    await expect(listQuoteTemplateOptions()).resolves.toEqual([])
    expect(getDataContext).not.toHaveBeenCalled()
  })

  it("getQuoteTemplate: itens em ordem; id inválido → null", async () => {
    mockQuery({ data: { id: ID, items: [{ position: 1, name: "B" }, { position: 0, name: "A" }] }, error: null })
    const result = await getQuoteTemplate(ID)
    expect(result.items.map((item) => item.name)).toEqual(["A", "B"])
    await expect(getQuoteTemplate("abc")).resolves.toBeNull()
  })
})

describe("deleteQuoteTemplate", () => {
  function mockDelete(result) {
    const builder = { delete: () => builder, eq: () => builder, select: () => builder, maybeSingle: async () => result }
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { from: () => builder } })
  }

  it("exclui", async () => {
    mockDelete({ data: { id: ID }, error: null })
    await expect(deleteQuoteTemplate(ID)).resolves.toBeUndefined()
  })

  it("nada excluído (sumiu ou é de outra pessoa) → não encontrado", async () => {
    mockDelete({ data: null, error: null })
    await expect(deleteQuoteTemplate(ID)).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("createTemplateFromQuote", () => {
  it("lê o orçamento no servidor e grava o conteúdo dele com o nome escolhido", async () => {
    getQuote.mockResolvedValue({
      id: "q1",
      client_id: "c1",
      title: "Site institucional",
      description: null,
      created_at: "2026-10-13T13:00:00+00:00",
      valid_until: "2026-10-28",
      discount_type: null,
      discount_value: null,
      tax_rate_bps: null,
      notes: null,
      terms: null,
      items: [{ position: 0, service_id: null, name: "Item", description: null, quantity_hundredths: 100, unit: "unit", unit_price_cents: 1000 }],
    })
    const rpc = vi.fn(async () => ({ data: ID, error: null }))
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })

    await expect(createTemplateFromQuote("q1", "Pacote")).resolves.toBe(ID)
    const [, params] = rpc.mock.calls[0]
    expect(params.p_template).toMatchObject({ name: "Pacote", title: "Site institucional", validity_days: 15 })
    expect(params.p_template).not.toHaveProperty("client_id")
    expect(params.p_items).toHaveLength(1)
  })

  it("orçamento inexistente → não encontrado, nada gravado", async () => {
    getQuote.mockResolvedValue(null)
    const rpc = vi.fn()
    getDataContext.mockResolvedValue({ user: { id: "u1" }, supabase: { rpc } })
    await expect(createTemplateFromQuote("q1", "Pacote")).rejects.toMatchObject({ code: "not_found" })
    expect(rpc).not.toHaveBeenCalled()
  })
})
