import { z } from "zod"

import { normalizeAccent } from "@/lib/accent"
import { formatDocument, formatPhone } from "@/lib/br"
import { optionalDocument, optionalEmail, optionalPhone, optionalWebsite } from "@/lib/validations/contact"
import { charLength, optionalText, requiredText } from "@/lib/validations/text"
import { websiteFormValue } from "@/lib/website"

// Schemas das configurações (etapa 38): perfil (a pessoa) e negócio (o
// emitente das propostas). Revalidados nas Server Actions; a saída já vem no
// formato do banco. Os limites repetem os CHECKs das migrações create_profiles
// e business_settings.

export const profileSchema = z.object({
  full_name: requiredText({
    min: 2,
    max: 80,
    minError: "Informe seu nome.",
    maxError: "O nome pode ter no máximo 80 caracteres.",
  }),
  phone: optionalPhone,
})

export const businessSchema = z.object({
  // Opcional: em branco, a proposta usa o nome do perfil.
  name: z
    .string()
    .trim()
    .refine((value) => !value || charLength(value) >= 2, { error: "O nome precisa ter pelo menos 2 caracteres." })
    .refine((value) => charLength(value) <= 120, { error: "O nome pode ter no máximo 120 caracteres." })
    .transform((value) => value || null),
  legal_name: optionalText(160, "A razão social"),
  document: optionalDocument,
  email: optionalEmail,
  phone: optionalPhone,
  website: optionalWebsite,
  address: optionalText(300, "O endereço"),
})

// Cor de destaque (etapa 39): "" = o índigo do InvoiceFlow (null no banco).
export const accentSchema = z.object({
  accent_color: z
    .string()
    .refine((value) => !value.trim() || normalizeAccent(value), { error: "Escolha uma cor válida, como #0f766e." })
    .transform((value) => normalizeAccent(value)),
})

export const EMPTY_BUSINESS_FORM = Object.freeze({
  name: "",
  legal_name: "",
  document: "",
  email: "",
  phone: "",
  website: "",
  address: "",
})

/** Perfil do banco → valores do formulário (strings formatadas). */
export function toProfileFormValues(profile) {
  return {
    full_name: profile?.full_name ?? "",
    phone: formatPhone(profile?.phone ?? ""),
  }
}

/** Negócio do banco (ou `null`, antes do primeiro "Salvar") → valores do formulário. */
export function toBusinessFormValues(business) {
  if (!business) return { ...EMPTY_BUSINESS_FORM }
  return {
    name: business.name ?? "",
    legal_name: business.legal_name ?? "",
    document: formatDocument(business.document ?? ""),
    email: business.email ?? "",
    phone: formatPhone(business.phone ?? ""),
    website: websiteFormValue(business.website),
    address: business.address ?? "",
  }
}

/**
 * Valores do formulário do negócio, como ficam se salvos agora (para a prévia
 * ao vivo): cada campo válido já normalizado; o que ainda não é válido (um CNPJ
 * pela metade) fica de fora, como se estivesse em branco.
 */
export function businessFromForm(values) {
  return Object.fromEntries(
    Object.entries(businessSchema.shape).map(([field, schema]) => {
      const result = schema.safeParse(values?.[field] ?? "")
      return [field, result.success ? result.data : null]
    }),
  )
}
