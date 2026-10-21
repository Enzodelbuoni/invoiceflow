import { z } from "zod"

import { formatDocument, formatPhone } from "@/lib/br"
import { optionalDocument, optionalEmail, optionalPhone } from "@/lib/validations/contact"
import { optionalText, requiredText } from "@/lib/validations/text"

// Schema do cliente: valida o formulário (React Hook Form) e é revalidado na
// Server Action. A saída já vem normalizada para o banco: textos aparados,
// campos vazios como null, telefone e documento só com dígitos.
// Os limites repetem os CHECKs da migração create_clients.

export const clientSchema = z.object({
  name: requiredText({
    min: 2,
    max: 120,
    minError: "Informe o nome do cliente.",
    maxError: "O nome pode ter no máximo 120 caracteres.",
  }),
  email: optionalEmail,
  phone: optionalPhone,
  company: optionalText(120, "A empresa"),
  document: optionalDocument,
  address: optionalText(300, "O endereço"),
  notes: optionalText(2000, "As observações"),
})

/** Valores iniciais do formulário (todos strings, como o RHF espera). */
export const EMPTY_CLIENT_FORM = Object.freeze({
  name: "",
  email: "",
  phone: "",
  company: "",
  document: "",
  address: "",
  notes: "",
})

/** Cliente do banco (null, só dígitos) → valores do formulário de edição (strings formatadas). */
export function toClientFormValues(client) {
  if (!client) return { ...EMPTY_CLIENT_FORM }
  return {
    name: client.name ?? "",
    email: client.email ?? "",
    phone: formatPhone(client.phone ?? ""),
    company: client.company ?? "",
    document: formatDocument(client.document ?? ""),
    address: client.address ?? "",
    notes: client.notes ?? "",
  }
}
