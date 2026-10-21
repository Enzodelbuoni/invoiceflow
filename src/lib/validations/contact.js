import { z } from "zod"

import { isValidCnpj, isValidCpf, onlyDigits } from "@/lib/br"
import { charLength } from "@/lib/validations/text"
import { isValidWebsite, normalizeWebsite } from "@/lib/website"

// Campos de contato opcionais, compartilhados pelos schemas de cliente, perfil
// e negócio. Saída no formato do banco: vazio vira null, telefone e documento
// só com dígitos, e-mail em minúsculas, site com o protocolo.

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => !value || z.email().safeParse(value).success, {
    error: "Digite um e-mail válido, como nome@empresa.com.",
  })
  .refine((value) => charLength(value) <= 254, { error: "O e-mail pode ter no máximo 254 caracteres." })
  .transform((value) => value || null)

export const optionalPhone = z
  .string()
  .transform(onlyDigits)
  .refine((digits) => !digits || digits.length === 10 || digits.length === 11, {
    error: "Telefone com DDD: 10 dígitos (fixo) ou 11 (celular).",
  })
  .transform((digits) => digits || null)

export const optionalDocument = z
  .string()
  .transform(onlyDigits)
  .refine((digits) => !digits || isValidCpf(digits) || isValidCnpj(digits), {
    error: "CPF ou CNPJ inválido. Confira os números.",
  })
  .transform((digits) => digits || null)

export const optionalWebsite = z
  .string()
  .transform(normalizeWebsite)
  .refine((url) => !url || isValidWebsite(url), { error: "Digite um endereço como meusite.com.br." })
  .refine((url) => charLength(url) <= 200, { error: "O endereço pode ter no máximo 200 caracteres." })
  .transform((url) => url || null)
