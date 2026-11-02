import "server-only"
import { cache } from "react"

import { getQuote } from "@/lib/data/quotes"
import { DataError, databaseError, getDataContext, isUuid } from "@/lib/data/shared"
import { templateTotals, toTemplateFromQuote } from "@/lib/quote-template"
import { isSupabaseConfigured } from "@/lib/supabase/env"

// Camada de acesso a dados dos modelos de orçamento (etapa 40; peças comuns em
// ./shared.js). Mesmos inteiros do orçamento: centavos, quantidade em
// centésimos e percentuais em pontos-base.

const TEMPLATE_COLUMNS = [
  "id, name, title, description, validity_days, discount_type, discount_value, tax_rate_bps",
  "notes, terms, created_at, updated_at",
  "items:quote_template_items(position, service_id, name, description, quantity_hundredths, unit, unit_price_cents)",
].join(", ")

/** Itens na ordem de position (o join do PostgREST não garante a ordem). */
const withItemsInOrder = (template) => ({
  ...template,
  items: [...template.items].sort((a, b) => a.position - b.position),
})

/** Modelo validado → argumentos das funções create/update_quote_template. */
function toTemplateParams({ items, ...fields }) {
  return { p_template: fields, p_items: items }
}

/** Erro ao gravar um modelo → DataError com mensagem amigável. */
function templateWriteError(error, fallback) {
  // Índice único (usuário + nome sem diferenciar maiúsculas).
  if (error.code === "23505") {
    return new DataError("name_taken", "Você já tem um modelo com este nome. Escolha outro.", { field: "name" })
  }
  if (error.code === "23503" && error.message?.includes("quote_template_items_service_fkey")) {
    return new DataError(
      "service_missing",
      "Um serviço deste modelo foi excluído do catálogo. Recarregue a página e tente de novo.",
    )
  }
  if (error.code === "28000") return new DataError("unauthenticated", "Sua sessão expirou. Entre novamente.")
  if (error.code === "P0002") return new DataError("not_found", "Modelo não encontrado.")
  if (error.code === "PT409") {
    return new DataError(
      "conflict",
      "Este modelo foi alterado em outra aba ou aparelho depois que você o abriu. Recarregue a página para ver a versão atual.",
    )
  }
  return databaseError("quote_templates", "write_failed", fallback, error)
}

/**
 * Modelos do usuário em ordem alfabética, com os itens (a lista mostra a
 * quantidade e o total estimado). Modo demonstração → lista vazia.
 */
export async function listQuoteTemplates() {
  if (!isSupabaseConfigured()) return []
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quote_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("user_id", user.id)
    .order("name")
  if (error) throw databaseError("quote_templates", "query_failed", "Não foi possível carregar os modelos.", error)
  return data.map(withItemsInOrder)
}

/**
 * Modelos para o seletor do construtor: só o que ele mostra (nome, título,
 * quantos itens e o total estimado), sem o conteúdo.
 * @returns {Promise<Array<{ id: string, name: string, title: string|null, itemCount: number,
 *   totalCents: number|null }>>}
 */
export async function listQuoteTemplateOptions() {
  const templates = await listQuoteTemplates()
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    title: template.title,
    itemCount: template.items.length,
    totalCents: templateTotals(template).total,
  }))
}

/**
 * Um modelo do usuário com os itens em ordem, ou `null` se não existir (ou for
 * de outra pessoa). `cache`: a página e generateMetadata pedem o mesmo modelo.
 */
export const getQuoteTemplate = cache(async (id) => {
  if (!isSupabaseConfigured() || !isUuid(id)) return null
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quote_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw databaseError("quote_templates", "query_failed", "Não foi possível carregar o modelo.", error)
  return data && withItemsInOrder(data)
})

/**
 * Cria o modelo com os itens numa transação só (função create_quote_template).
 * `template` no formato do banco, já validado.
 * @returns {Promise<string>} id do modelo
 */
export async function insertQuoteTemplate(template) {
  const { supabase } = await getDataContext()
  const { data, error } = await supabase.rpc("create_quote_template", toTemplateParams(template))
  if (error) throw templateWriteError(error, "Não foi possível salvar o modelo.")
  return data
}

/**
 * Salva a edição de um modelo (função update_quote_template): campos e itens
 * numa transação só. `expectedUpdatedAt`: o updated_at lido ao abrir a edição.
 */
export async function updateQuoteTemplate(id, expectedUpdatedAt, template) {
  if (!isUuid(id)) throw new DataError("not_found", "Modelo não encontrado.")
  const { supabase } = await getDataContext()
  const { error } = await supabase.rpc("update_quote_template", {
    p_template_id: id,
    p_expected_updated_at: expectedUpdatedAt,
    ...toTemplateParams(template),
  })
  if (error) throw templateWriteError(error, "Não foi possível salvar as alterações do modelo.")
}

/** Exclui o modelo (itens em cascata). Orçamentos criados com ele não mudam. */
export async function deleteQuoteTemplate(id) {
  if (!isUuid(id)) throw new DataError("not_found", "Modelo não encontrado.")
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quote_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle()
  if (error) throw databaseError("quote_templates", "delete_failed", "Não foi possível excluir o modelo.", error)
  if (!data) throw new DataError("not_found", "Modelo não encontrado.")
}

/**
 * "Salvar como modelo": lê o orçamento no servidor (de qualquer status) e grava
 * o conteúdo dele como um modelo novo com o nome escolhido.
 * @returns {Promise<string>} id do modelo
 */
export async function createTemplateFromQuote(quoteId, name) {
  const quote = await getQuote(quoteId)
  if (!quote) throw new DataError("not_found", "Orçamento não encontrado.")
  return insertQuoteTemplate(toTemplateFromQuote(quote, { name }))
}
