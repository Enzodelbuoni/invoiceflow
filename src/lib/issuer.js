import { logoPublicUrl } from "@/lib/branding"

// Emitente das propostas (etapa 38): os dados do negócio, com os do perfil no
// lugar do que estiver em branco (nome, e-mail da conta, telefone). A função
// get_public_quote do banco aplica a mesma regra na página pública. Desde a
// etapa 39 leva também o logo (URL pública) e a cor de destaque.

/**
 * @param {{ profile?: { full_name?: string|null, email?: string|null, phone?: string|null } | null,
 *   business?: object | null, fallbackName: string }} input
 *   `fallbackName`: nome quando nem o negócio nem o perfil têm um.
 * @returns {{ name: string, legal_name: string|null, document: string|null, email: string|null,
 *   phone: string|null, website: string|null, address: string|null, logo_url: string|null,
 *   accent_color: string|null }}
 */
export function toIssuer({ profile, business, fallbackName }) {
  return {
    name: business?.name || profile?.full_name || fallbackName,
    legal_name: business?.legal_name ?? null,
    document: business?.document ?? null,
    email: business?.email || profile?.email || null,
    phone: business?.phone || profile?.phone || null,
    website: business?.website ?? null,
    address: business?.address ?? null,
    logo_url: logoPublicUrl(business?.logo_path),
    accent_color: business?.accent_color ?? null,
  }
}

/** Emitente vindo da get_public_quote (com `logo_path`) → com a URL pública do logo. */
export function withLogoUrl(issuer) {
  if (!issuer) return issuer
  const { logo_path: logoPath, ...rest } = issuer
  return { ...rest, logo_url: logoPublicUrl(logoPath) }
}
