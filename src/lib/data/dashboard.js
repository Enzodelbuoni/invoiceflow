import "server-only"

import { dashboardMetrics } from "@/lib/dashboard"
import { databaseError, getDataContext } from "@/lib/data/shared"
import { ACTIVITY_EVENT_TYPES, RECENT_ACTIVITY_LIMIT, toActivityItems } from "@/lib/quote-events"
import { isSupabaseConfigured } from "@/lib/supabase/env"

// Números do painel (Sprint 18). A conta é feita no banco (função
// quote_dashboard, com o RLS valendo); aqui só se derivam as métricas.

/**
 * Métricas do painel para as propostas desde `since` (Date) ou de sempre
 * (null). Sem Supabase configurado (modo demonstração) → null.
 */
export async function getDashboard(since) {
  if (!isSupabaseConfigured()) return null
  const { supabase } = await getDataContext()
  const { data, error } = await supabase.rpc("quote_dashboard", { p_since: since ? since.toISOString() : null })
  if (error) throw databaseError("dashboard", "query_failed", "Não foi possível carregar os números do painel.", error)
  return dashboardMetrics(data)
}

/**
 * Envios por dia desde `since` (Date) ou de sempre (null), para o gráfico
 * (função quote_sends_by_day; o app agrupa em semanas/meses/anos). Modo
 * demonstração → [].
 * @returns {Promise<Array<{ day: string, reached: number, approved: number,
 *   reached_value_cents: number, approved_value_cents: number }>>}
 */
export async function getSendSeries(since) {
  if (!isSupabaseConfigured()) return []
  const { supabase } = await getDataContext()
  const { data, error } = await supabase.rpc("quote_sends_by_day", { p_since: since ? since.toISOString() : null })
  if (error) throw databaseError("dashboard", "query_failed", "Não foi possível carregar o gráfico do painel.", error)
  return data ?? []
}

/**
 * Últimos acontecimentos das propostas (Sprint 18), de qualquer período: os
 * marcos e o que o cliente fez (ver ACTIVITY_EVENT_TYPES), com a proposta e o
 * cliente. Usa o índice (user_id, created_at desc). Modo demonstração → [].
 */
export async function listRecentActivity(limit = RECENT_ACTIVITY_LIMIT) {
  if (!isSupabaseConfigured()) return []
  const { user, supabase } = await getDataContext()
  const { data, error } = await supabase
    .from("quote_events")
    .select("id, type, metadata, created_at, quote:quotes(id, quote_number, title, client:clients(name))")
    .eq("user_id", user.id)
    .in("type", ACTIVITY_EVENT_TYPES)
    // Download só o do cliente (metadata.by); os outros tipos passam.
    .or("type.neq.downloaded,metadata->>by.eq.client")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw databaseError("dashboard", "query_failed", "Não foi possível carregar a atividade recente.", error)
  return toActivityItems(data ?? [])
}
