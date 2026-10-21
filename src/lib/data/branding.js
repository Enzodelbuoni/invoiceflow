import "server-only"

import { LOGO_BUCKET, newLogoPath } from "@/lib/branding"
import { DataError, databaseError, getDataContext } from "@/lib/data/shared"
import { processLogo } from "@/lib/logo-image"
import { logError } from "@/lib/safe-log"

// Identidade visual do negócio (etapa 39): logo no Storage (bucket `logos`) e
// cor de destaque, nas colunas logo_path/accent_color de `businesses`. As
// políticas do Storage só deixam cada usuário gravar e apagar na própria pasta.

async function currentLogoPath(supabase, userId) {
  const { data, error } = await supabase.from("businesses").select("logo_path").eq("user_id", userId).maybeSingle()
  if (error) throw databaseError("branding", "query_failed", "Não foi possível carregar o logo atual.", error)
  return data?.logo_path ?? null
}

/** Apaga um arquivo antigo sem atrapalhar quem chamou (só registra no log se falhar). */
async function removeQuietly(supabase, path) {
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove([path])
  if (error) logError("data:branding", "remove_failed", error, { stack: false })
}

/**
 * Logo novo: regrava a imagem (processLogo), envia com nome novo, aponta o
 * negócio para ele e só então apaga o anterior. Se gravar no banco falhar, o
 * arquivo novo é apagado (nada fica órfão). Devolve o caminho no bucket.
 */
export async function uploadLogo(bytes) {
  const { user, supabase } = await getDataContext()
  const image = await processLogo(bytes)
  const previous = await currentLogoPath(supabase, user.id)

  const path = newLogoPath(user.id)
  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, image.data, { contentType: "image/webp", cacheControl: "31536000", upsert: false })
  if (uploadError) {
    logError("data:branding", "upload_failed", uploadError, { stack: false })
    throw new DataError("upload_failed", "Não foi possível enviar o logo. Tente de novo.")
  }

  const { error } = await supabase.from("businesses").upsert({ user_id: user.id, logo_path: path }, { onConflict: "user_id" })
  if (error) {
    await removeQuietly(supabase, path)
    throw databaseError("branding", "save_failed", "Não foi possível salvar o logo.", error)
  }

  if (previous) await removeQuietly(supabase, previous)
  return path
}

/** Tira o logo do negócio (volta às iniciais) e apaga o arquivo. */
export async function removeLogo() {
  const { user, supabase } = await getDataContext()
  const previous = await currentLogoPath(supabase, user.id)
  if (!previous) return
  const { error } = await supabase.from("businesses").update({ logo_path: null }).eq("user_id", user.id)
  if (error) throw databaseError("branding", "save_failed", "Não foi possível remover o logo.", error)
  await removeQuietly(supabase, previous)
}

/** `accentColor` já validado pelo accentSchema ("#rrggbb" ou null = índigo do InvoiceFlow). */
export async function saveAccentColor(accentColor) {
  const { user, supabase } = await getDataContext()
  const { error } = await supabase
    .from("businesses")
    .upsert({ user_id: user.id, accent_color: accentColor }, { onConflict: "user_id" })
  if (error) throw databaseError("branding", "save_failed", "Não foi possível salvar a cor.", error)
}
