import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { MAX_TOTAL_CENTS } from "@/lib/calculations/quote"
import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-status"
import { SERVICE_UNIT_VALUES } from "@/lib/constants/service-units"
import { MAX_PRICE_CENTS } from "@/lib/money"
import { MAX_PERCENT_BASIS_POINTS } from "@/lib/percent"
import { MAX_QUANTITY_HUNDREDTHS } from "@/lib/quantity"

import { QUOTE_LIMITS, VALIDITY_MAX_DAYS } from "./quote"

// A migração create_quotes repete os limites do app. Se um lado mudar sem o
// outro, o formulário aceitaria algo que o banco recusa (ou o contrário) e a
// pessoa só veria "não foi possível salvar".
const sql = readFileSync(new URL("../../../supabase/migrations/20261012204730_create_quotes.sql", import.meta.url), "utf8")

/** Trecho do CREATE TABLE de uma tabela, para não confundir colunas homônimas. */
function tableBody(name) {
  const start = sql.indexOf(`create table public.${name} (`)
  const end = sql.indexOf("\n);", start)
  return sql.slice(start, end)
}

const quotes = tableBody("quotes")
const items = tableBody("quote_items")

describe("migração create_quotes × limites do app", () => {
  it("textos do orçamento", () => {
    expect(quotes).toContain(`char_length(btrim(title)) between ${QUOTE_LIMITS.titleMin} and ${QUOTE_LIMITS.titleMax}`)
    expect(quotes).toContain(`char_length(description) <= ${QUOTE_LIMITS.description}`)
    expect(quotes).toContain(`char_length(notes) <= ${QUOTE_LIMITS.notes}`)
    expect(quotes).toContain(`char_length(terms) <= ${QUOTE_LIMITS.terms}`)
  })

  it("status: a mesma lista de constants/quote-status.js", () => {
    const list = QUOTE_STATUS_VALUES.map((status) => `'${status}'`).join(", ")
    expect(quotes.replace(/\s+/g, " ")).toContain(`status in (${list})`)
  })

  it("valores e percentuais", () => {
    expect(quotes).toContain(`subtotal_cents between 0 and ${MAX_TOTAL_CENTS}`)
    expect(quotes).toContain(`total_cents between 0 and ${MAX_TOTAL_CENTS}`)
    expect(quotes).toContain(`discount_value between 1 and ${MAX_PERCENT_BASIS_POINTS}`)
    expect(quotes).toContain(`discount_value between 1 and ${MAX_PRICE_CENTS}`)
    expect(quotes).toContain(`tax_rate_bps between 1 and ${MAX_PERCENT_BASIS_POINTS}`)
  })

  it("itens", () => {
    expect(items).toContain(
      `char_length(btrim(name)) between ${QUOTE_LIMITS.itemNameMin} and ${QUOTE_LIMITS.itemNameMax}`,
    )
    expect(items).toContain(`char_length(description) <= ${QUOTE_LIMITS.itemDescription}`)
    expect(items).toContain(`quantity_hundredths between 1 and ${MAX_QUANTITY_HUNDREDTHS}`)
    expect(items).toContain(`unit_price_cents between 0 and ${MAX_PRICE_CENTS}`)
    expect(items).toContain(`subtotal_cents between 0 and ${MAX_TOTAL_CENTS}`)
    expect(items).toContain(`position between 0 and ${QUOTE_LIMITS.items - 1}`)
    const units = SERVICE_UNIT_VALUES.map((unit) => `'${unit}'`).join(", ")
    expect(items.replace(/\s+/g, " ")).toContain(`unit in (${units})`)
  })

  it("função create_quote: de 1 a 100 itens e validade de até 1 ano", () => {
    expect(sql).toContain(`jsonb_array_length(p_items) not between 1 and ${QUOTE_LIMITS.items}`)
    expect(sql).toContain(`v_valid_until > v_today + ${VALIDITY_MAX_DAYS}`)
  })
})
