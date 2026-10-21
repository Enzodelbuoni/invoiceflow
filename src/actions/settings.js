"use server"

import { revalidatePath } from "next/cache"

import { parseInput, toFailure } from "@/lib/action-result"
import { checkLogoFile, logoPublicUrl } from "@/lib/branding"
import { removeLogo, saveAccentColor, uploadLogo } from "@/lib/data/branding"
import { saveBusiness, updateProfile } from "@/lib/data/profiles"
import { accentSchema, businessSchema, profileSchema } from "@/lib/validations/settings"

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

/**
 * Logo (etapa 39): recebe o arquivo num FormData (campo "logo"). Tamanho e
 * tipo são conferidos de novo aqui; o formato real, pelo conteúdo, no
 * processLogo. Devolve `{ ok, logoUrl }`.
 */
export async function uploadLogoAction(formData) {
  const file = formData instanceof FormData ? formData.get("logo") : null
  const problem = file instanceof File ? checkLogoFile(file) : "Escolha uma imagem."
  if (problem) return { ok: false, message: problem }
  try {
    const path = await uploadLogo(Buffer.from(await file.arrayBuffer()))
    revalidatePath("/", "layout")
    return { ok: true, logoUrl: logoPublicUrl(path) }
  } catch (error) {
    return toFailure("settings", error)
  }
}

export async function removeLogoAction() {
  try {
    await removeLogo()
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (error) {
    return toFailure("settings", error)
  }
}

export async function saveAccentAction(values) {
  const { data, failure } = parseInput(accentSchema, values)
  if (failure) return failure
  try {
    await saveAccentColor(data.accent_color)
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
