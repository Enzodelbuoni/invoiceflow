import { redirect } from "next/navigation"

import { getSafeRedirect } from "@/lib/auth/redirect"
import { createClient } from "@/lib/supabase/server"

// Tipos de link de e-mail usados com token_hash (templates próprios).
const ALLOWED_TYPES = new Set(["email", "recovery"])

/**
 * Destino dos links enviados por e-mail pelo Supabase. Aceita os dois formatos:
 *
 * 1. Templates padrão (plano Free sem SMTP próprio): o link passa pelo Supabase
 *    e volta com `?code=...&next=...` (fluxo PKCE). O código só pode ser trocado
 *    no mesmo navegador que pediu o e-mail.
 * 2. Templates próprios (com SMTP): `?token_hash=...&type=recovery&next=...`.
 *
 * Em ambos, troca o código por uma sessão (cookies) e redireciona para `next`.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = getSafeRedirect(searchParams.get("next"))

  if (code || (tokenHash && ALLOWED_TYPES.has(type))) {
    const supabase = await createClient()
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) redirect(next)
  }

  // Link inválido, vencido, já usado ou aberto em outro navegador.
  const isRecovery = type === "recovery" || next === "/reset-password"
  redirect(isRecovery ? "/reset-password?erro=link-invalido" : "/login?erro=link-invalido")
}
