// Logo do negócio (etapa 39): regras que valem no navegador (conferência antes
// de enviar) e no servidor. O arquivo é regravado no servidor (lib/logo-image.js)
// e guardado no bucket público `logos`, em <user_id>/logo-<uuid>.webp.

export const LOGO_BUCKET = "logos"
export const LOGO_MAX_BYTES = 2 * 1024 * 1024
export const LOGO_TYPES = Object.freeze(["image/png", "image/jpeg", "image/webp"])

/** Mensagem de erro para um arquivo que nem vale a pena enviar, ou `null`. */
export function checkLogoFile(file) {
  if (!file || !file.size) return "Escolha uma imagem."
  if (!LOGO_TYPES.includes(file.type)) return "Use uma imagem PNG, JPG ou WebP."
  if (file.size > LOGO_MAX_BYTES) return "A imagem pode ter no máximo 2 MB."
  return null
}

/** Caminho de um logo novo (nome novo a cada envio: a URL nunca fica velha no cache). */
export function newLogoPath(userId, id = crypto.randomUUID()) {
  return `${userId}/logo-${id}.webp`
}

/** URL pública do logo (bucket público), ou `null` sem logo ou sem Supabase. */
export function logoPublicUrl(path) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!path || !base) return null
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${LOGO_BUCKET}/${path}`
}
