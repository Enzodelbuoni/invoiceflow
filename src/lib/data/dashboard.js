import "server-only"

import { dashboardMetrics } from "@/lib/dashboard"
import { databaseError, getDataContext } from "@/lib/data/shared"
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
