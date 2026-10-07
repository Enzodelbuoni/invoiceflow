// Formatadores pt-BR. Instâncias de Intl criadas uma vez só (são caras de criar).
// Moeda fica em lib/money.js (formatCurrency recebe CENTAVOS inteiros).

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

/** 0.425 → "42,5%" (recebe fração, não porcentagem) */
export function formatPercent(fraction) {
  return percentFormatter.format(fraction)
}

/** Date → "Segunda-feira, 6 de outubro" (fuso de São Paulo) */
export function formatLongDate(date) {
  const text = longDateFormatter.format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
})

/** Date | string ISO → "6 de out. de 2026" (fuso de São Paulo) */
export function formatShortDate(date) {
  return shortDateFormatter.format(new Date(date))
}
