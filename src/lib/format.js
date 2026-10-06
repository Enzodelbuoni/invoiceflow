// Formatadores pt-BR. Instâncias de Intl criadas uma vez só (são caras de criar).

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
})

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
})

/** 1500 → "R$ 1.500,00" */
export function formatCurrency(value) {
  return currencyFormatter.format(value)
}

/** 0.425 → "42,5%" (recebe fração, não porcentagem) */
export function formatPercent(fraction) {
  return percentFormatter.format(fraction)
}

/** Date → "Segunda-feira, 6 de outubro" (fuso de São Paulo) */
export function formatLongDate(date) {
  const text = longDateFormatter.format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}
