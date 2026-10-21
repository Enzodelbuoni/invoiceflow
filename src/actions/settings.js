"use server"

import { revalidatePath } from "next/cache"

import { parseInput, toFailure } from "@/lib/action-result"
import { saveBusiness, updateProfile } from "@/lib/data/profiles"
import { businessSchema, profileSchema } from "@/lib/validations/settings"

// Server Actions das configurações (etapa 38). Revalidam a entrada aqui (podem
// ser chamadas direto por POST); a camada de dados confere o usuário.
// O nome e os contatos aparecem no menu e em todas as propostas, então tudo é
// revalidado a partir da raiz.

export async function updateProfileAction(values) {
  const { data, failure } = parseInput(profileSchema, values)
  if (failure) return failure
  try {
    await updateProfile(data)
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (error) {
    return toFailure("settings", error)
  }
}

export async function saveBusinessAction(values) {
  const { data, failure } = parseInput(businessSchema, values)
  if (failure) return failure
  try {
    await saveBusiness(data)
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (error) {
    return toFailure("settings", error)
  }
}
