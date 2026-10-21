import { readdirSync, readFileSync } from "node:fs"

import { describe, expect, it, vi } from "vitest"

import { toIssuer, withLogoUrl } from "@/lib/issuer"

import {
  EMPTY_BUSINESS_FORM,
  accentSchema,
  businessFromForm,
  businessSchema,
  profileSchema,
  toBusinessFormValues,
  toProfileFormValues,
} from "./settings"

const MIGRATIONS = new URL("../../../supabase/migrations/", import.meta.url)
const migration = (name) => readFileSync(new URL(name, MIGRATIONS), "utf8")

/** A migração mais recente que contém `text` (a definição em vigor de uma função). */
const latestMigrationWith = (text) =>
  readdirSync(MIGRATIONS)
    .sort()
    .reverse()
    .map(migration)
    .find((sql) => sql.includes(text))

const errors = (schema, values) =>
  Object.fromEntries(schema.safeParse(values).error.issues.map((issue) => [issue.path.join("."), issue.message]))

describe("profileSchema", () => {
  it("nome aparado e telefone só com dígitos", () => {
    expect(profileSchema.parse({ full_name: "  Ana Souza ", phone: "(11) 91234-5678" })).toEqual({
      full_name: "Ana Souza",
      phone: "11912345678",
    })
  })

  it("telefone vazio vira null", () => {
    expect(profileSchema.parse({ full_name: "Ana", phone: "" }).phone).toBeNull()
  })

  it("nome obrigatório (2 a 80) e telefone com DDD", () => {
    expect(errors(profileSchema, { full_name: " A ", phone: "1234" })).toEqual({
      full_name: "Informe seu nome.",
      phone: "Telefone com DDD: 10 dígitos (fixo) ou 11 (celular).",
    })
    expect(errors(profileSchema, { full_name: "a".repeat(81), phone: "" })).toEqual({
      full_name: "O nome pode ter no máximo 80 caracteres.",
    })
  })

  it("perfil do banco → formulário", () => {
    expect(toProfileFormValues({ full_name: "Ana", email: "ana@x.com", phone: "1133334444" })).toEqual({
      full_name: "Ana",
      phone: "(11) 3333-4444",
    })
  })
})

describe("businessSchema", () => {
  const filled = {
    name: " Estúdio Aurora ",
    legal_name: "Aurora Design Ltda",
    document: "11.222.333/0001-81",
    email: "Contato@Aurora.com.br",
    phone: "(11) 3333-4444",
    website: "aurora.com.br",
    address: "Rua A, 1 — São Paulo/SP",
  }

  it("formulário preenchido → formato do banco", () => {
    expect(businessSchema.parse(filled)).toEqual({
      name: "Estúdio Aurora",
      legal_name: "Aurora Design Ltda",
      document: "11222333000181",
      email: "contato@aurora.com.br",
      phone: "1133334444",
      website: "https://aurora.com.br",
      address: "Rua A, 1 — São Paulo/SP",
    })
  })

  it("tudo em branco é válido (a proposta usa o perfil)", () => {
    expect(businessSchema.parse(EMPTY_BUSINESS_FORM)).toEqual({
      name: null,
      legal_name: null,
      document: null,
      email: null,
      phone: null,
      website: null,
      address: null,
    })
  })

  it("mensagens de cada campo inválido", () => {
    expect(
      errors(businessSchema, {
        name: "A",
        legal_name: "x".repeat(161),
        document: "123.456.789-00",
        email: "contato@",
        phone: "11 9",
        website: "meu site",
        address: "x".repeat(301),
      }),
    ).toEqual({
      name: "O nome precisa ter pelo menos 2 caracteres.",
      legal_name: "A razão social pode ter no máximo 160 caracteres.",
      document: "CPF ou CNPJ inválido. Confira os números.",
      email: "Digite um e-mail válido, como nome@empresa.com.",
      phone: "Telefone com DDD: 10 dígitos (fixo) ou 11 (celular).",
      website: "Digite um endereço como meusite.com.br.",
      address: "O endereço pode ter no máximo 300 caracteres.",
    })
  })

  it("site com mais de 200 caracteres (contando o https://)", () => {
    const website = `${"a".repeat(186)}.com.br/x` // 195 + "https://" = 203
    expect(errors(businessSchema, { ...EMPTY_BUSINESS_FORM, website })).toEqual({
      website: "O endereço pode ter no máximo 200 caracteres.",
    })
  })

  it("banco → formulário → schema devolve o mesmo negócio", () => {
    const saved = businessSchema.parse(filled)
    expect(businessSchema.parse(toBusinessFormValues(saved))).toEqual(saved)
    expect(toBusinessFormValues(null)).toEqual(EMPTY_BUSINESS_FORM)
    expect(toBusinessFormValues(saved)).toMatchObject({ document: "11.222.333/0001-81", website: "aurora.com.br" })
  })

  it("prévia ao vivo: o que ainda não é válido fica de fora", () => {
    expect(businessFromForm({ ...filled, document: "11.222", email: "contato@" })).toMatchObject({
      name: "Estúdio Aurora",
      document: null,
      email: null,
      phone: "1133334444",
    })
    expect(businessFromForm(undefined)).toEqual(businessSchema.parse(EMPTY_BUSINESS_FORM))
  })

  it("os limites são os mesmos dos CHECKs das migrações", () => {
    const business = migration("20261021161431_business_settings.sql")
    expect(business).toMatch(/char_length\(btrim\(name\)\) between 2 and 120/)
    expect(business).toMatch(/char_length\(legal_name\) <= 160/)
    expect(business).toMatch(/char_length\(website\) <= 200/)
    expect(business).toMatch(/char_length\(address\) <= 300/)
    expect(business).toMatch(/phone ~ '\^\[0-9\]\{10,11\}\$'/)
    expect(business).toMatch(/document ~ '\^\(\[0-9\]\{11\}\|\[0-9\]\{14\}\)\$'/)
    expect(migration("20261006174424_create_profiles.sql")).toMatch(/char_length\(full_name\) <= 80/)
  })
})

describe("toIssuer (mesma regra da get_public_quote)", () => {
  const profile = { full_name: "Ana Souza", email: "ana@conta.com", phone: "11912345678" }

  it("sem negócio: o perfil", () => {
    expect(toIssuer({ profile, business: null, fallbackName: "ana" })).toEqual({
      name: "Ana Souza",
      legal_name: null,
      document: null,
      email: "ana@conta.com",
      phone: "11912345678",
      website: null,
      address: null,
      logo_url: null,
      accent_color: null,
    })
  })

  it("negócio preenchido vence; o que está em branco vem do perfil", () => {
    const business = { ...businessSchema.parse(EMPTY_BUSINESS_FORM), name: "Estúdio Aurora", document: "11222333000181" }
    expect(toIssuer({ profile, business, fallbackName: "ana" })).toMatchObject({
      name: "Estúdio Aurora",
      document: "11222333000181",
      email: "ana@conta.com",
      phone: "11912345678",
    })
  })

  it("sem nome em lugar nenhum: o nome de reserva", () => {
    expect(toIssuer({ profile: { full_name: "" }, business: { name: null }, fallbackName: "ana" }).name).toBe("ana")
    expect(toIssuer({ fallbackName: "Você" })).toMatchObject({ name: "Você", email: null })
  })

  it("a get_public_quote (a versão mais recente) aplica a mesma ordem e leva logo e cor", () => {
    const sql = latestMigrationWith("function public.get_public_quote")
    expect(sql).toMatch(/coalesce\(nullif\(btrim\(b\.name\), ''\), nullif\(btrim\(p\.full_name\), ''\), split_part\(p\.email, '@', 1\)\)/)
    expect(sql).toMatch(/'email', coalesce\(b\.email, p\.email\)/)
    expect(sql).toMatch(/'phone', coalesce\(b\.phone, p\.phone\)/)
    expect(sql).toMatch(/'logo_path', b\.logo_path/)
    expect(sql).toMatch(/'accent_color', b\.accent_color/)
  })
})

describe("withLogoUrl (emitente da página pública)", () => {
  it("troca o caminho do logo pela URL pública", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co")
    expect(withLogoUrl({ name: "Aurora", logo_path: "u1/logo-1.webp", accent_color: "#0f766e" })).toEqual({
      name: "Aurora",
      logo_url: "https://abc.supabase.co/storage/v1/object/public/logos/u1/logo-1.webp",
      accent_color: "#0f766e",
    })
    expect(withLogoUrl({ name: "Aurora", logo_path: null })).toEqual({ name: "Aurora", logo_url: null })
    expect(withLogoUrl(null)).toBeNull()
    vi.unstubAllEnvs()
  })
})

describe("accentSchema", () => {
  it.each([
    ["", null],
    ["#0F766E", "#0f766e"],
    ["0f766e", "#0f766e"],
  ])("%j → %j", (accent_color, expected) => {
    expect(accentSchema.parse({ accent_color })).toEqual({ accent_color: expected })
  })

  it("cor inválida é recusada", () => {
    expect(errors(accentSchema, { accent_color: "vermelho" })).toEqual({ accent_color: "Escolha uma cor válida, como #0f766e." })
  })

  it("o formato é o mesmo do CHECK do banco", () => {
    expect(migration("20261021170258_branding.sql")).toMatch(/accent_color ~ '\^#\[0-9a-f\]\{6\}\$'/)
  })
})
