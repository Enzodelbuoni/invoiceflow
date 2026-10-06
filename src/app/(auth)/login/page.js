import Link from "next/link"

import { AuthHeading } from "@/components/auth/auth-heading"
import { LoginForm } from "@/components/auth/login-form"

export const metadata = { title: "Entrar" }

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Bem-vindo de volta" description="Entre para acompanhar suas propostas e aprovações." />
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="font-medium text-primary-ink underline-offset-4 hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </>
  )
}
