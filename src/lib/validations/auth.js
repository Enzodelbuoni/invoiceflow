import { z } from "zod"

// Schemas dos formulários de autenticação. Usados no cliente (React Hook Form)
// e, a partir da etapa 6, também no servidor.

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: "Informe seu e-mail." })
  .pipe(z.email({ error: "Digite um e-mail válido, como nome@empresa.com." }))

// Requisitos mínimos de uma senha nova. A lista também alimenta o checklist
// visual do formulário (PasswordStrength).
export const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "Pelo menos 8 caracteres", test: (value) => value.length >= 8 },
  { id: "letter", label: "Uma letra", test: (value) => /[A-Za-zÀ-ÿ]/.test(value) },
  { id: "number", label: "Um número", test: (value) => /\d/.test(value) },
]

const newPassword = z
  .string()
  .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
  .max(128, { error: "A senha pode ter no máximo 128 caracteres." })
  .regex(/[A-Za-zÀ-ÿ]/, { error: "Inclua pelo menos uma letra." })
  .regex(/\d/, { error: "Inclua pelo menos um número." })

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Informe sua senha." }),
})

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Informe seu nome." })
    .max(80, { error: "O nome pode ter no máximo 80 caracteres." }),
  email,
  password: newPassword,
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, { error: "Confirme a nova senha." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não são iguais.",
    path: ["confirmPassword"],
  })

/**
 * Força da senha de 0 a 4: comprimento, letras + números, 12+ caracteres
 * e variedade (maiúsculas e minúsculas, ou símbolos).
 */
export function getPasswordStrength(value) {
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score++
  if (/[A-Za-zÀ-ÿ]/.test(value) && /\d/.test(value)) score++
  if (value.length >= 12) score++
  if (/[^A-Za-z0-9]/.test(value) || (/[a-z]/.test(value) && /[A-Z]/.test(value))) score++
  return score
}
