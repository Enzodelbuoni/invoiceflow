import { AuthHeading } from "@/components/auth/auth-heading"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata = { title: "Recuperar senha" }

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Esqueceu a senha?"
        description="Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha."
      />
      <ForgotPasswordForm />
    </>
  )
}
