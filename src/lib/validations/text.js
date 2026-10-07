import { z } from "zod"

// Regras de texto compartilhadas pelos schemas. Os limites são contados como o
// Postgres conta (char_length = code points): em JS, "😀".length é 2, mas no
// banco é 1. Contar diferente deixaria passar no formulário um nome que o CHECK
// do banco recusa (e a pessoa só veria "não foi possível salvar").

/** Quantidade de caracteres como o Postgres conta: charLength("😀") === 1. */
export function charLength(text) {
  return [...text].length
}

/** Texto obrigatório, aparado, com mínimo e máximo de caracteres. */
export const requiredText = ({ min, max, minError, maxError }) =>
  z
    .string()
    .trim()
    .refine((value) => charLength(value) >= min, { error: minError })
    .refine((value) => charLength(value) <= max, { error: maxError })

/** Texto opcional: "" vira null; senão aplica `max`. */
export const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .refine((value) => charLength(value) <= max, {
      error: `${label} pode ter no máximo ${max} caracteres.`,
    })
    .transform((value) => value || null)
