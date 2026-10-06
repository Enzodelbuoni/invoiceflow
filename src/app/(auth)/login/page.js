import Link from "next/link"

import { AuthHeading } from "@/components/auth/auth-heading"
import { LoginForm } from "@/components/auth/login-form"
import { getSafeRedirect } from "@/lib/auth/redirect"

export const metadata = { title: "Entrar" }

const URL_ERRORS = {
  "link-invalido": "O link de confirmação é inválido ou já expirou. Entre com sua senha ou peça um novo link.",
}

export default async function LoginPage({ searchParams }) {
  const { next, erro } = await searchParams

  return (
    <>
      <AuthHeading title="Bem-vindo de volta" description="Entre para acompanhar suas propostas e aprovações." />
      <LoginForm next={getSafeRedirect(next)} initialError={URL_ERRORS[erro] ?? null} />
      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="font-medium text-primary-ink underline-offset-4 hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </>
  )
}
