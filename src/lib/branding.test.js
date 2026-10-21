import { readFileSync } from "node:fs"

import { afterEach, describe, expect, it, vi } from "vitest"

import { LOGO_MAX_BYTES, checkLogoFile, logoPublicUrl, newLogoPath } from "./branding"

afterEach(() => vi.unstubAllEnvs())

const file = (type, size) => ({ type, size })

describe("checkLogoFile (conferência antes de enviar)", () => {
  it.each([
    [file("image/png", 1000), null],
    [file("image/jpeg", LOGO_MAX_BYTES), null],
    [file("image/webp", 10), null],
    [null, "Escolha uma imagem."],
    [file("image/png", 0), "Escolha uma imagem."],
    [file("image/svg+xml", 1000), "Use uma imagem PNG, JPG ou WebP."],
    [file("image/gif", 1000), "Use uma imagem PNG, JPG ou WebP."],
    [file("application/pdf", 1000), "Use uma imagem PNG, JPG ou WebP."],
    [file("image/png", LOGO_MAX_BYTES + 1), "A imagem pode ter no máximo 2 MB."],
  ])("%j → %j", (value, expected) => {
    expect(checkLogoFile(value)).toBe(expected)
  })
})

describe("newLogoPath", () => {
  it("pasta do usuário + nome novo, no formato que o CHECK do banco aceita", () => {
    const userId = "6f1c1d2e-0000-4000-8000-000000000001"
    const path = newLogoPath(userId)
    const sql = readFileSync(new URL("../../supabase/migrations/20261021170258_branding.sql", import.meta.url), "utf8")
    const pattern = /logo_path ~ '(.+?)'/.exec(sql)[1]
    expect(path).toMatch(new RegExp(pattern))
    expect(path.startsWith(`${userId}/`)).toBe(true)
    expect(newLogoPath(userId)).not.toBe(path)
  })
})

describe("logoPublicUrl", () => {
  it("URL do bucket público", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/")
    expect(logoPublicUrl("u1/logo-1.webp")).toBe("https://abc.supabase.co/storage/v1/object/public/logos/u1/logo-1.webp")
  })

  it("sem logo ou sem Supabase: null", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co")
    expect(logoPublicUrl(null)).toBeNull()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    expect(logoPublicUrl("u1/logo-1.webp")).toBeNull()
  })
})
