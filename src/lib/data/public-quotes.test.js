import { beforeEach, describe, expect, it, vi } from "vitest"

import { DataError } from "@/lib/data/shared"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

import { approveQuote, declineQuote } from "./public-quotes"

// "server-only" lança erro fora do servidor do Next; aqui ele vira um módulo vazio.
vi.mock("server-only", () => ({}))
// O cliente Supabase (cookies da requisição) é trocado por um falso em cada teste.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: vi.fn(() => true) }))
// O contexto do usuário não é usado aqui (a página pública não tem login).
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }))

const PUBLIC_ID = "6f1c1d2e-0000-4000-8000-0000000000aa"
const APPROVAL = { signer_name: "Bruno Cliente", signer_email: "bruno@cliente.com", accept_terms: true }
const META = { ip: "203.0.113.7", userAgent: "Mozilla/5.0" }

/** Supabase falso: `rpc` devolve `result` e guarda os argumentos. */
function fakeSupabase(result) {
  const rpc = vi.fn(async () => result)
  createClient.mockResolvedValue({ rpc })
  return rpc
}

beforeEach(() => {
  vi.clearAllMocks()
  isSupabaseConfigured.mockReturnValue(true)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("approveQuote", () => {
  it("chama approve_quote com o aceite e a evidência (IP e navegador)", async () => {
    const rpc = fakeSupabase({ data: "2026-10-14T18:32:00+00:00", error: null })
    await expect(approveQuote(PUBLIC_ID, APPROVAL, META)).resolves.toBe("2026-10-14T18:32:00+00:00")
    expect(rpc).toHaveBeenCalledWith("approve_quote", {
      p_public_id: PUBLIC_ID,
      p_signer_name: "Bruno Cliente",
      p_signer_email: "bruno@cliente.com",
      p_accept_terms: true,
      p_ip_address: "203.0.113.7",
      p_user_agent: "Mozilla/5.0",
    })
  })

  it("sem IP/navegador manda null", async () => {
    const rpc = fakeSupabase({ data: "2026-10-14T18:32:00+00:00", error: null })
    await approveQuote(PUBLIC_ID, APPROVAL)
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_ip_address: null, p_user_agent: null })
  })

  it("id inválido não consulta o banco", async () => {
    const rpc = fakeSupabase({ data: null, error: null })
    await expect(approveQuote("abc", APPROVAL, META)).rejects.toMatchObject({ code: "not_found" })
    expect(rpc).not.toHaveBeenCalled()
  })

  it("sem Supabase configurado → aviso", async () => {
    isSupabaseConfigured.mockReturnValue(false)
    await expect(approveQuote(PUBLIC_ID, APPROVAL, META)).rejects.toMatchObject({ code: "not_configured" })
  })

  it.each([
    ["P0002", "not_found", "Esta proposta não foi encontrada."],
    ["55000", "already_answered", "Esta proposta já foi respondida ou cancelada. Veja a situação atual na página."],
    ["22023", "expired", "O prazo desta proposta terminou. Peça uma proposta atualizada a quem a enviou."],
    ["PT403", "owner", "Você enviou esta proposta. Só o cliente pode aprová-la ou recusá-la."],
    ["23514", "invalid", "Confira os dados informados e tente de novo."],
  ])("erro %s do banco → %s", async (sqlState, code, message) => {
    fakeSupabase({ data: null, error: { code: sqlState, message: "x" } })
    const error = await approveQuote(PUBLIC_ID, APPROVAL, META).catch((caught) => caught)
    expect(error).toBeInstanceOf(DataError)
    expect(error).toMatchObject({ code, message })
    expect(console.error).not.toHaveBeenCalled()
  })

  it("erro inesperado → mensagem genérica e registro no log", async () => {
    fakeSupabase({ data: null, error: { code: "08006", message: "conexão caiu" } })
    await expect(approveQuote(PUBLIC_ID, APPROVAL, META)).rejects.toMatchObject({
      code: "response_failed",
      message: "Não foi possível registrar a aprovação.",
    })
    expect(console.error).toHaveBeenCalled()
  })
})

describe("declineQuote", () => {
  it("chama decline_quote com o motivo", async () => {
    const rpc = fakeSupabase({ data: "2026-10-14T18:40:00+00:00", error: null })
    await expect(declineQuote(PUBLIC_ID, { reason: "Achei caro." }, META)).resolves.toBe("2026-10-14T18:40:00+00:00")
    expect(rpc).toHaveBeenCalledWith("decline_quote", {
      p_public_id: PUBLIC_ID,
      p_reason: "Achei caro.",
      p_ip_address: "203.0.113.7",
      p_user_agent: "Mozilla/5.0",
    })
  })

  it("mesma tradução de erros da aprovação", async () => {
    fakeSupabase({ data: null, error: { code: "55000", message: "x" } })
    await expect(declineQuote(PUBLIC_ID, { reason: null }, META)).rejects.toMatchObject({ code: "already_answered" })
  })

  it("erro inesperado → mensagem da recusa", async () => {
    fakeSupabase({ data: null, error: { code: "XX000", message: "?" } })
    await expect(declineQuote(PUBLIC_ID, { reason: null }, META)).rejects.toMatchObject({
      message: "Não foi possível registrar a recusa.",
    })
  })
})
