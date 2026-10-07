"use server"

import { revalidatePath } from "next/cache"

import { parseInput, toFailure } from "@/lib/action-result"
import { deleteClient, insertClient, updateClient } from "@/lib/data/clients"
import { clientSchema } from "@/lib/validations/client"

// Server Actions de clientes. Podem ser chamadas direto por POST, então cada uma
// revalida a entrada aqui; a camada de dados confere o usuário e o dono do registro.
// Retorno: { ok: true, id? } ou { ok: false, message, fieldErrors? }.

export async function createClientAction(values) {
  const { data, failure } = parseInput(clientSchema, values)
  if (failure) return failure
  try {
    const { id } = await insertClient(data)
    revalidatePath("/clients")
    return { ok: true, id }
  } catch (error) {
    return toFailure("clients", error)
  }
}

export async function updateClientAction(id, values) {
  const { data, failure } = parseInput(clientSchema, values)
  if (failure) return failure
  try {
    await updateClient(id, data)
    revalidatePath("/clients")
    revalidatePath(`/clients/${id}`)
    return { ok: true, id }
  } catch (error) {
    return toFailure("clients", error)
  }
}

export async function deleteClientAction(id) {
  try {
    await deleteClient(id)
    revalidatePath("/clients")
    return { ok: true }
  } catch (error) {
    return toFailure("clients", error)
  }
}
