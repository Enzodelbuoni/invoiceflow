import { afterEach, describe, expect, it, vi } from "vitest"

import { getDataContext } from "@/lib/data/shared"
import { processLogo } from "@/lib/logo-image"

import { removeLogo, saveAccentColor, uploadLogo } from "./branding"

// "server-only" lança erro fora do servidor do Next; aqui ele vira um módulo vazio.
vi.mock("server-only", () => ({}))
vi.mock("@/lib/data/shared", async (importOriginal) => ({ ...(await importOriginal()), getDataContext: vi.fn() }))
vi.mock("@/lib/logo-image", () => ({ processLogo: vi.fn(async () => ({ data: Buffer.from("webp"), width: 512, height: 205 })) }))

const USER = "6f1c1d2e-0000-4000-8000-000000000001"
const OLD = `${USER}/logo-6f1c1d2e-0000-4000-8000-0000000000aa.webp`

afterEach(() => vi.clearAllMocks())

/**
 * Supabase falso: guarda a ordem das chamadas. `current`: logo_path atual;
 * `uploadError` / `saveError`: falhas simuladas.
 */
function mockSupabase({ current = null, uploadError = null, saveError = null } = {}) {
  const calls = []
  const storage = {
    upload: vi.fn(async (path, data, options) => (calls.push(["upload", path, options]), { error: uploadError })),
    remove: vi.fn(async (paths) => (calls.push(["remove", ...paths]), { error: null })),
  }
  const table = {
    select: () => table,
    eq: () => table,
    maybeSingle: async () => ({ data: current ? { logo_path: current } : null, error: null }),
    upsert: vi.fn(async (row, options) => (calls.push(["upsert", row, options]), { error: saveError })),
    update: vi.fn((row) => (calls.push(["update", row]), { eq: async () => ({ error: saveError }) })),
  }
  const supabase = { from: () => table, storage: { from: (bucket) => (calls.push(["bucket", bucket]), storage) } }
  getDataContext.mockResolvedValue({ user: { id: USER }, supabase })
  return { calls, storage, table }
}

const steps = (calls) => calls.filter(([name]) => name !== "bucket").map(([name]) => name)

describe("uploadLogo", () => {
  it("regrava, envia com nome novo na pasta do usuário, aponta o negócio e só então apaga o antigo", async () => {
    const { calls, table } = mockSupabase({ current: OLD })
    const path = await uploadLogo(Buffer.from("png"))

    expect(processLogo).toHaveBeenCalledWith(Buffer.from("png"))
    expect(path).toMatch(new RegExp(`^${USER}/logo-[0-9a-f-]{36}\\.webp$`))
    expect(steps(calls)).toEqual(["upload", "upsert", "remove"])
    expect(calls.find(([name]) => name === "upload")).toEqual([
      "upload",
      path,
      { contentType: "image/webp", cacheControl: "31536000", upsert: false },
    ])
    expect(table.upsert).toHaveBeenCalledWith({ user_id: USER, logo_path: path }, { onConflict: "user_id" })
    expect(calls.find(([name]) => name === "remove")).toEqual(["remove", OLD])
    expect(calls.filter(([name]) => name === "bucket").every(([, bucket]) => bucket === "logos")).toBe(true)
  })

  it("primeiro logo: nada para apagar", async () => {
    const { calls } = mockSupabase()
    await uploadLogo(Buffer.from("png"))
    expect(steps(calls)).toEqual(["upload", "upsert"])
  })

  it("imagem inválida: nada é enviado", async () => {
    const { calls } = mockSupabase({ current: OLD })
    processLogo.mockRejectedValueOnce(Object.assign(new Error("Use uma imagem PNG, JPG ou WebP."), { name: "DataError" }))
    await expect(uploadLogo(Buffer.from("svg"))).rejects.toMatchObject({ name: "DataError" })
    expect(steps(calls)).toEqual([])
  })

  it("falha no envio: mensagem amigável, banco intocado, logo antigo continua", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const { calls } = mockSupabase({ current: OLD, uploadError: { message: "Payload too large", statusCode: "413" } })
    await expect(uploadLogo(Buffer.from("png"))).rejects.toMatchObject({ code: "upload_failed" })
    expect(steps(calls)).toEqual(["upload"])
    expect(log).toHaveBeenCalledOnce()
    log.mockRestore()
  })

  it("falha ao gravar no banco: o arquivo novo é apagado (nada órfão) e o antigo fica", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const { calls } = mockSupabase({ current: OLD, saveError: { code: "23514", message: "check" } })
    await expect(uploadLogo(Buffer.from("png"))).rejects.toMatchObject({ code: "save_failed" })
    const uploaded = calls.find(([name]) => name === "upload")[1]
    expect(steps(calls)).toEqual(["upload", "upsert", "remove"])
    expect(calls.find(([name]) => name === "remove")).toEqual(["remove", uploaded])
    log.mockRestore()
  })
})

describe("removeLogo", () => {
  it("tira do negócio e apaga o arquivo", async () => {
    const { calls } = mockSupabase({ current: OLD })
    await removeLogo()
    expect(steps(calls)).toEqual(["update", "remove"])
    expect(calls[0]).toEqual(["update", { logo_path: null }])
    expect(calls.find(([name]) => name === "remove")).toEqual(["remove", OLD])
  })

  it("sem logo: não faz nada", async () => {
    const { calls } = mockSupabase()
    await removeLogo()
    expect(calls).toEqual([])
  })
})

describe("saveAccentColor", () => {
  it("grava só a cor (o resto do negócio fica como está)", async () => {
    const { table } = mockSupabase()
    await saveAccentColor("#0f766e")
    expect(table.upsert).toHaveBeenCalledWith({ user_id: USER, accent_color: "#0f766e" }, { onConflict: "user_id" })
  })
})
