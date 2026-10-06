"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { FormAlert } from "@/components/auth/form-alert"
import { PasswordInput } from "@/components/auth/password-input"
import { PasswordStrength } from "@/components/auth/password-strength"
import { SubmitButton } from "@/components/auth/submit-button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { confirmPasswordReset, getAuthErrorMessage } from "@/lib/auth/client"
import { resetPasswordSchema } from "@/lib/validations/auth"

export function ResetPasswordForm() {
  const router = useRouter()
  const [formError, setFormError] = useState(null)
  const [navigating, startNavigation] = useTransition()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  })
  const password = useWatch({ control, name: "password" })

  async function onSubmit({ password }) {
    setFormError(null)
    try {
      await confirmPasswordReset({ password })
      toast.success("Senha alterada!", { description: "Você já está conectado com a nova senha." })
      startNavigation(() => router.push("/dashboard"))
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
    }
  }

  const busy = isSubmitting || navigating

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FormAlert>{formError}</FormAlert>

      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Nova senha</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={["password-strength", errors.password && "password-error"].filter(Boolean).join(" ")}
            {...register("password")}
          />
          <FieldError id="password-error" errors={[errors.password]} />
          <PasswordStrength id="password-strength" value={password} />
        </Field>

        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirme a nova senha</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            {...register("confirmPassword")}
          />
          <FieldError id="confirmPassword-error" errors={[errors.confirmPassword]} />
        </Field>
      </FieldGroup>

      <SubmitButton loading={busy} loadingText="Salvando…">
        Salvar nova senha
      </SubmitButton>
    </form>
  )
}
