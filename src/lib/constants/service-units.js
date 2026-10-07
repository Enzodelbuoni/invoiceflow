// Unidades de cobrança dos serviços. Os valores (em inglês) são os gravados no
// banco e precisam ser EXATAMENTE os do CHECK de services.unit (há um teste que
// confere a migração); os rótulos (pt-BR) são os exibidos na interface.
export const SERVICE_UNIT = Object.freeze({
  HOUR: "hour",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  PROJECT: "project",
  UNIT: "unit",
  PAGE: "page",
  WORD: "word",
})

export const SERVICE_UNIT_VALUES = Object.freeze(Object.values(SERVICE_UNIT))

/** Unidade sugerida num serviço novo (freelancers cobram por hora com mais frequência). */
export const DEFAULT_SERVICE_UNIT = SERVICE_UNIT.HOUR

// Singular e plural, para "R$ 150,00 / hora" e "10 horas".
const UNIT_NAMES = Object.freeze({
  hour: ["hora", "horas"],
  day: ["dia", "dias"],
  week: ["semana", "semanas"],
  month: ["mês", "meses"],
  project: ["projeto", "projetos"],
  unit: ["unidade", "unidades"],
  page: ["página", "páginas"],
  word: ["palavra", "palavras"],
})

/** Opções do seletor de unidade: [{ value: "hour", label: "Hora" }, …] */
export const SERVICE_UNIT_OPTIONS = Object.freeze(
  SERVICE_UNIT_VALUES.map((value) => {
    const [singular] = UNIT_NAMES[value]
    return Object.freeze({ value, label: singular.charAt(0).toUpperCase() + singular.slice(1) })
  }),
)

export function isServiceUnit(value) {
  return SERVICE_UNIT_VALUES.includes(value)
}

/**
 * "hour" → "hora". Com quantidade, segue a norma do português: de 1 até menos
 * de 2 fica no singular ("1,5 hora"); o resto vai para o plural ("0 horas",
 * "2 horas"). Unidade desconhecida → "".
 */
export function formatServiceUnit(value, quantity = 1) {
  const names = UNIT_NAMES[value]
  if (!names) return ""
  const amount = Math.abs(quantity)
  return amount >= 1 && amount < 2 ? names[0] : names[1]
}
