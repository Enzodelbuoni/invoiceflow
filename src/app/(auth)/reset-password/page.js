import Link from "next/link"
import { LinkIcon } from "lucide-react"

import { AuthHeading } from "@/components/auth/auth-heading"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/server"

export const metadata = { title: "Nova senha" }

// Fluxo do Supabase: o link do e-mail passa por /auth/confirm, que abre uma
// sessão de recuperação e redireciona para cá. Link inválido ou vencido chega
// com ?erro=link-invalido; sem sessão também não há como trocar a senha.
export default async function ResetPasswordPage({ searchParams }) {
  const { erro } = await searchParams
  const user = await getCurrentUser()

  if (erro === "link-invalido" || !user) {
    return (
      <>
        <span className="flex size-12 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-sm">
          <LinkIcon aria-hidden="true" className="size-5" />
        </span>
        <AuthHeading
          title="Link inválido ou expirado"
          description="Este link de recuperação não é válido. Peça um novo e use-o em até 1 hora."
        />
        <Button asChild className="h-10 w-full">
          <Link href="/forgot-password">Pedir um novo link</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <AuthHeading title="Crie uma nova senha" description="Escolha uma senha forte que você ainda não usou aqui." />
      <ResetPasswordForm />
    </>
  )
}
