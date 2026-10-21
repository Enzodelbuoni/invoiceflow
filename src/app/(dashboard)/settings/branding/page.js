import { BrandingForm } from "@/components/settings/branding-form"
import { getIssuer } from "@/lib/data/profiles"

export const metadata = { title: "Identidade visual · Configurações" }

export default async function BrandingSettingsPage() {
  const issuer = await getIssuer()
  return <BrandingForm issuer={issuer} />
}
