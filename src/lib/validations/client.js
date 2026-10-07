import { z } from "zod"

import { isValidCnpj, isValidCpf, onlyDigits } from "@/lib/br"

// Schema do cliente: valida o formulário (React Hook Form) e é revalidado na
// Server Action. A saída já vem normalizada para o banco: textos aparados,
// campos vazios como null, telefone e documento só com dígitos.

/** Texto opcional: "" vira null; senão aplica `max`. */
const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} pode ter no máximo ${max} caracteres.` })
    .transform((value) => value || null)

export const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Informe o nome do cliente." })
    .max(120, { error: "O nome pode ter no máximo 120 caracteres." }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => !value || z.email().safeParse(value).success, {
      error: "Digite um e-mail válido, como nome@empresa.com.",
    })
    .transform((value) => value || null),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((digits) => !digits || digits.length === 10 || digits.length === 11, {
      error: "Telefone com DDD: 10 dígitos (fixo) ou 11 (celular).",
    })
    .transform((digits) => digits || null),
  company: optionalText(120, "A empresa"),
  document: z
    .string()
    .transform(onlyDigits)
    .refine((digits) => !digits || isValidCpf(digits) || isValidCnpj(digits), {
      error: "CPF ou CNPJ inválido. Confira os números.",
    })
    .transform((digits) => digits || null),
  address: optionalText(300, "O endereço"),
  notes: optionalText(2000, "As observações"),
})

/** Valores iniciais do formulário (todos strings, como o RHF espera). */
export const EMPTY_CLIENT_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  document: "",
  address: "",
  notes: "",
}
