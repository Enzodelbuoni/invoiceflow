"use server"

import { revalidatePath } from "next/cache"

import { parseInput, toFailure } from "@/lib/action-result"
import { deleteService, insertService, updateService } from "@/lib/data/services"
import { serviceSchema } from "@/lib/validations/service"

// Server Actions de serviços. Podem ser chamadas direto por POST, então cada uma
// revalida a entrada aqui; a camada de dados confere o usuário e o dono do registro.
// Retorno: { ok: true, id? } ou { ok: false, message, fieldErrors? }.

export async function createServiceAction(values) {
  const { data, failure } = parseInput(serviceSchema, values)
  if (failure) return failure
  try {
    const { id } = await insertService(data)
    revalidatePath("/services")
    return { ok: true, id }
  } catch (error) {
    return toFailure("services", error)
  }
}

export async function updateServiceAction(id, values) {
  const { data, failure } = parseInput(serviceSchema, values)
  if (failure) return failure
  try {
    await updateService(id, data)
    revalidatePath("/services")
    return { ok: true, id }
  } catch (error) {
    return toFailure("services", error)
  }
}

export async function deleteServiceAction(id) {
  try {
    await deleteService(id)
    revalidatePath("/services")
    return { ok: true }
  } catch (error) {
    return toFailure("services", error)
  }
}
