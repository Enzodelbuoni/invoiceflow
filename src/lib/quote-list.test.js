import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-status"

import {
  EMPTY_STATUS_COUNTS,
  QUOTE_LIST_PAGE_SIZE,
  QUOTE_LIST_PERIODS,
  QUOTE_SORTS,
  QUOTE_STATUS_FILTERS,
  clearFiltersHref,
  emptyResultTitle,
  isFiltered,
  pageCount,
  pageRange,
  paginationItems,
  parseQuoteListParams,
  quoteListHref,
  quoteListQuery,
  statusFilterCount,
  validityHint,
} from "./quote-list"

const DEFAULT_PARAMS = { query: "", status: "todos", period: "tudo", sort: "recentes", page: 1 }

describe("parseQuoteListParams", () => {
  it("sem nada na URL → padrões", () => {
    expect(parseQuoteListParams({})).toEqual(DEFAULT_PARAMS)
    expect(parseQuoteListParams()).toEqual(DEFAULT_PARAMS)
  })

  it("lê os valores válidos", () => {
    expect(
      parseQuoteListParams({ q: "  aurora  ", status: "em-aberto", periodo: "90d", ordem: "maior-valor", pagina: "3" }),
    ).toEqual({ query: "aurora", status: "em-aberto", period: "90d", sort: "maior-valor", page: 3 })
  })

  it.each([
    ["status", { status: "sent" }, "status", "todos"],
    ["período", { periodo: "7d" }, "period", "tudo"],
    ["ordem", { ordem: "valor" }, "sort", "recentes"],
    ["parâmetro repetido", { status: ["rascunhos", "aprovados"] }, "status", "todos"],
    ["busca repetida", { q: ["a", "b"] }, "query", ""],
  ])("%s inválido → padrão", (_, searchParams, key, expected) => {
    expect(parseQuoteListParams(searchParams)[key]).toBe(expected)
  })

  it.each(["0", "-2", "1.5", "abc", "", "99999999999999999999"])("página %j → 1", (pagina) => {
    expect(parseQuoteListParams({ pagina }).page).toBe(1)
  })

  it("corta a busca em 80 caracteres", () => {
    expect(parseQuoteListParams({ q: "x".repeat(200) }).query).toHaveLength(80)
  })
})

describe("quoteListQuery", () => {
  const now = new Date("2026-10-19T15:00:00Z")

  it("padrões → tudo, sem status, mais recentes, 1ª página", () => {
    expect(quoteListQuery(DEFAULT_PARAMS, now)).toEqual({
      query: "",
      statuses: null,
      since: null,
      sort: "recent",
      limit: QUOTE_LIST_PAGE_SIZE,
      offset: 0,
    })
  })

  it("traduz status, período, ordem e página", () => {
    const query = quoteListQuery({ query: "x", status: "em-aberto", period: "30d", sort: "validade", page: 3 }, now)
    expect(query.statuses).toEqual(["sent", "viewed"])
    expect(query.since).toEqual(new Date("2026-09-19T15:00:00Z"))
    expect(query.sort).toBe("valid_until")
    expect(query.offset).toBe(2 * QUOTE_LIST_PAGE_SIZE)
  })
})

describe("quoteListHref", () => {
  it("padrões ficam fora da URL", () => {
    expect(quoteListHref(DEFAULT_PARAMS)).toBe("/quotes")
  })

  it("mantém os filtros e volta para a página 1 ao mudar um filtro", () => {
    const params = { query: "joão & cia", status: "aprovados", period: "12m", sort: "antigos", page: 4 }
    expect(quoteListHref(params, { status: "recusados" })).toBe(
      "/quotes?q=jo%C3%A3o+%26+cia&status=recusados&periodo=12m&ordem=antigos",
    )
  })

  it("muda só a página", () => {
    expect(quoteListHref({ ...DEFAULT_PARAMS, status: "rascunhos" }, { page: 2 })).toBe(
      "/quotes?status=rascunhos&pagina=2",
    )
    expect(quoteListHref({ ...DEFAULT_PARAMS, page: 5 }, { page: 1 })).toBe("/quotes")
  })

  it("ida e volta pela URL", () => {
    const params = { query: "aurora", status: "em-aberto", period: "90d", sort: "menor-valor", page: 2 }
    const search = new URLSearchParams(quoteListHref(params, { page: 2 }).split("?")[1])
    expect(parseQuoteListParams(Object.fromEntries(search))).toEqual(params)
  })
})

describe("isFiltered / clearFiltersHref", () => {
  it("ordenação não conta como filtro", () => {
    expect(isFiltered(DEFAULT_PARAMS)).toBe(false)
    expect(isFiltered({ ...DEFAULT_PARAMS, sort: "maior-valor", page: 2 })).toBe(false)
    expect(isFiltered({ ...DEFAULT_PARAMS, query: "a" })).toBe(true)
    expect(isFiltered({ ...DEFAULT_PARAMS, status: "rascunhos" })).toBe(true)
    expect(isFiltered({ ...DEFAULT_PARAMS, period: "30d" })).toBe(true)
  })

  it("limpar mantém a ordenação", () => {
    const params = { query: "a", status: "rascunhos", period: "30d", sort: "maior-valor", page: 3 }
    expect(clearFiltersHref(params)).toBe("/quotes?ordem=maior-valor")
  })
})

describe("emptyResultTitle", () => {
  it.each([
    [{}, "Nenhum orçamento"],
    [{ status: "rascunhos" }, "Nenhum rascunho"],
    [{ status: "em-aberto", query: "aurora" }, "Nenhum orçamento em aberto para “aurora”"],
    [{ status: "aprovados", query: "joão", period: "30d" }, "Nenhum orçamento aprovado para “joão” nos últimos 30 dias"],
    [{ period: "12m" }, "Nenhum orçamento nos últimos 12 meses"],
  ])("%j → %s", (changes, expected) => {
    expect(emptyResultTitle({ ...DEFAULT_PARAMS, ...changes })).toBe(expected)
  })
})

describe("validityHint", () => {
  const today = "2026-10-19"

  it.each([
    ["sent", "2026-10-19", { text: "vence hoje", tone: "warning" }],
    ["viewed", "2026-10-20", { text: "vence amanhã", tone: "warning" }],
    ["sent", "2026-10-22", { text: "vence em 3 dias", tone: "warning" }],
    ["draft", "2026-10-23", { text: "vence em 4 dias", tone: "muted" }],
    ["draft", "2026-10-18", { text: "venceu ontem", tone: "danger" }],
    ["sent", "2026-10-16", { text: "venceu há 3 dias", tone: "danger" }],
  ])("%s até %s", (status, valid_until, expected) => {
    expect(validityHint({ status, valid_until }, today)).toEqual(expected)
  })

  it.each(["approved", "declined", "expired", "cancelled"])("%s → sem dica", (status) => {
    expect(validityHint({ status, valid_until: "2026-10-20" }, today)).toBeNull()
  })

  it("data inválida → sem dica", () => {
    expect(validityHint({ status: "sent", valid_until: "" }, today)).toBeNull()
  })
})

describe("statusFilterCount", () => {
  const counts = { draft: 2, sent: 3, viewed: 1, approved: 4, declined: 0, expired: 1, cancelled: 5 }
  const filter = (value) => QUOTE_STATUS_FILTERS.find((item) => item.value === value)

  it.each([
    ["todos", 16],
    ["rascunhos", 2],
    ["em-aberto", 4],
    ["aprovados", 4],
    ["recusados", 0],
  ])("%s → %i", (value, expected) => {
    expect(statusFilterCount(filter(value), counts)).toBe(expected)
  })

  it("contagens zeradas", () => {
    expect(statusFilterCount(filter("todos"), EMPTY_STATUS_COUNTS)).toBe(0)
  })

  it("cada status do banco está em exatamente uma aba (fora Todos)", () => {
    const covered = QUOTE_STATUS_FILTERS.flatMap((item) => item.statuses ?? [])
    expect([...covered].sort()).toEqual([...QUOTE_STATUS_VALUES].sort())
  })
})

describe("pageCount / pageRange", () => {
  it.each([
    [0, 1],
    [1, 1],
    [20, 1],
    [21, 2],
    [57, 3],
  ])("%i resultados → %i páginas", (total, expected) => {
    expect(pageCount(total)).toBe(expected)
  })

  it("posição dos itens", () => {
    expect(pageRange(1, 57)).toEqual({ from: 1, to: 20 })
    expect(pageRange(2, 57)).toEqual({ from: 21, to: 40 })
    expect(pageRange(3, 57)).toEqual({ from: 41, to: 57 })
    expect(pageRange(1, 0)).toEqual({ from: 0, to: 0 })
  })
})

describe("paginationItems", () => {
  it.each([
    [1, 1, [1]],
    [2, 5, [1, 2, 3, 4, 5]],
    [4, 7, [1, 2, 3, 4, 5, 6, 7]],
    [1, 10, [1, 2, 3, 4, 5, "gap-end", 10]],
    [4, 10, [1, 2, 3, 4, 5, "gap-end", 10]],
    [5, 10, [1, "gap-start", 4, 5, 6, "gap-end", 10]],
    [6, 10, [1, "gap-start", 5, 6, 7, "gap-end", 10]],
    [7, 10, [1, "gap-start", 6, 7, 8, 9, 10]],
    [10, 10, [1, "gap-start", 6, 7, 8, 9, 10]],
    [5, 8, [1, "gap-start", 4, 5, 6, 7, 8]],
  ])("página %i de %i", (page, pages, expected) => {
    expect(paginationItems(page, pages)).toEqual(expected)
  })

  it("sempre mostra a atual, a primeira e a última, sem repetir, em ordem, com até 7 botões", () => {
    for (let pages = 1; pages <= 30; pages++) {
      for (let page = 1; page <= pages; page++) {
        const items = paginationItems(page, pages)
        const numbers = items.filter((item) => typeof item === "number")
        expect(numbers).toContain(page)
        expect(numbers[0]).toBe(1)
        expect(numbers.at(-1)).toBe(pages)
        expect(numbers).toEqual([...new Set(numbers)].sort((a, b) => a - b))
        expect(items.length).toBeLessThanOrEqual(7)
        // Um "gap" esconde pelo menos 2 páginas.
        items.forEach((item, index) => {
          if (typeof item === "string") expect(items[index + 1] - items[index - 1]).toBeGreaterThan(2)
        })
      }
    }
  })
})

describe("coerência com a função list_quotes do banco", () => {
  const migration = readFileSync(new URL("../../supabase/migrations/20261019155526_list_quotes.sql", import.meta.url), "utf8")

  it("cada ordenação existe na função", () => {
    for (const sort of QUOTE_SORTS.filter((item) => item.sql !== "recent")) {
      expect(migration).toContain(`p_sort = '${sort.sql}'`)
    }
    expect(migration).toContain("p_sort text default 'recent'")
  })

  it("o tamanho da página cabe no limite da função", () => {
    expect(migration).toContain("least(greatest(p_limit, 1), 100)")
    expect(QUOTE_LIST_PAGE_SIZE).toBeLessThanOrEqual(100)
  })

  it("os períodos são os do painel", () => {
    expect(QUOTE_LIST_PERIODS.map((period) => period.value)).toEqual(["tudo", "30d", "90d", "12m"])
  })
})
