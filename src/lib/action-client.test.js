import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

import { OFFLINE_MESSAGE, isSessionExpired, runAction } from "./action-client"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), dismiss: vi.fn() } }))

afterEach(() => vi.clearAllMocks())

describe("runAction", () => {
  it("devolve o resultado da action", async () => {
    await expect(runAction(async () => ({ ok: true, id: "c1" }))).resolves.toEqual({ ok: true, id: "c1" })
    await expect(runAction(async () => ({ ok: false, message: "Confira os campos." }))).resolves.toEqual({
      ok: false,
      message: "Confira os campos.",
    })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("sem conexão (a chamada rejeita) → resultado com offline, sem exceção solta", async () => {
    const result = await runAction(async () => {
      throw new TypeError("Failed to fetch")
    })
    expect(result).toEqual({ ok: false, offline: true, message: OFFLINE_MESSAGE })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("sessão expirada → aviso único com o botão de entrar de novo", async () => {
    const expired = { ok: false, message: "Sua sessão expirou. Entre novamente.", code: "unauthenticated" }
    await expect(runAction(async () => expired)).resolves.toBe(expired)
    expect(toast.error).toHaveBeenCalledOnce()
    const [title, options] = toast.error.mock.calls[0]
    expect(title).toBe("Sua sessão expirou")
    expect(options).toMatchObject({ id: "session-expired", duration: Infinity, action: { label: "Entrar novamente" } })
  })

  it("sucesso depois de entrar de novo tira o aviso antigo da tela", async () => {
    await runAction(async () => ({ ok: true }))
    expect(toast.dismiss).toHaveBeenCalledWith("session-expired")
  })
})

describe("isSessionExpired", () => {
  it.each([
    [{ ok: false, code: "unauthenticated" }, true],
    [{ ok: false, code: "not_found" }, false],
    [{ ok: true }, false],
    [{ ok: false, offline: true }, false],
    [undefined, false],
  ])("%j → %j", (result, expected) => {
    expect(isSessionExpired(result)).toBe(expected)
  })
})
