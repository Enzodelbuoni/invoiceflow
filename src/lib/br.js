// Utilitários para dados brasileiros: CPF, CNPJ e telefone.
// No banco tudo é guardado só com dígitos; a formatação é só para exibição.

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "")
}

// Rejeita sequências repetidas (ex.: 111.111.111-11), que passam no cálculo.
const allSameDigits = (digits) => /^(\d)\1+$/.test(digits)

export function isValidCpf(value) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || allSameDigits(cpf)) return false
  const checkDigit = (length) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return checkDigit(9) === Number(cpf[9]) && checkDigit(10) === Number(cpf[10])
}

export function isValidCnpj(value) {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || allSameDigits(cnpj)) return false
  const checkDigit = (length) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((acc, weight, i) => acc + Number(cnpj[i]) * weight, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return checkDigit(12) === Number(cnpj[12]) && checkDigit(13) === Number(cnpj[13])
}

/** Máscara progressiva: CPF até 11 dígitos, CNPJ de 12 a 14. */
export function formatDocument(value) {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2")
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}

/** Máscara progressiva: (11) 3456-7890 ou (11) 93456-7890. */
export function formatPhone(value) {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
