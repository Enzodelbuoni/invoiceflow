"use server"

import { revalidatePath } from "next/cache"

import { DataError, deleteClient, insertClient, updateClient } from "@/lib/data/clients"
import { clientSchema } from "@/lib/validations/client"

// Server Actions de clientes. Podem ser chamadas direto por POST, então cada uma
// revalida a entrada aqui; a camada de dados confere o usuário e o dono do registro.
// Retorno: { ok: true, id? } ou { ok: false, message, fieldErrors? }.

const UNEXPECTED = "Algo deu errado. Tente novamente em instantes."

function toFailure(error) {
  if (error instanceof DataError) return { ok: false, message: error.message }
  console.error("[clients] erro inesperado:", error)
  return { ok: false, message: UNEXPECTED }
}

function parse(values) {
  const result = clientSchema.safeParse(values)
  if (result.success) return { data: result.data }
  const fieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message
  }
  return { failure: { ok: false, message: "Confira os campos destacados.", fieldErrors } }
}

export async function createClientAction(values) {
  const { data, failure } = parse(values)
  if (failure) return failure
  try {
    const { id } = await insertClient(data)
    revalidatePath("/clients")
    return { ok: true, id }
  } catch (error) {
    return toFailure(error)
  }
}

export async function updateClientAction(id, values) {
  const { data, failure } = parse(values)
  if (failure) return failure
  try {
    await updateClient(id, data)
    revalidatePath("/clients")
    revalidatePath(`/clients/${id}`)
    return { ok: true, id }
  } catch (error) {
    return toFailure(error)
  }
}

export async function deleteClientAction(id) {
  try {
    await deleteClient(id)
    revalidatePath("/clients")
    return { ok: true }
  } catch (error) {
    return toFailure(error)
  }
}
