import { BusinessForm } from "@/components/settings/business-form"
import { requireUser } from "@/lib/auth/server"
import { getBusiness, getProfile } from "@/lib/data/profiles"

export const metadata = { title: "Negócio · Configurações" }

export default async function BusinessSettingsPage() {
  const [user, profile, business] = await Promise.all([requireUser(), getProfile(), getBusiness()])
  return <BusinessForm business={business} profile={profile} fallbackName={user.name} />
}
