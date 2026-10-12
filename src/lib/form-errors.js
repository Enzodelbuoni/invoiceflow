// Leitura dos erros do React Hook Form (formState.errors) para formulários
// grandes: contar os campos com problema e achar o primeiro na ordem da tela.
// Um erro de campo é um objeto com `message` ({ type, message, ref }); listas
// (useFieldArray) viram arrays de objetos, com o erro da lista inteira no
// próprio objeto ou em `root`, conforme o resolver.

function isFieldError(value) {
  return Boolean(value) && typeof value === "object" && typeof value.message === "string"
}

/** Mensagem do erro da lista inteira (ex.: "Adicione pelo menos um item"), se houver. */
export function listErrorMessage(error) {
  if (isFieldError(error)) return error.message
  if (isFieldError(error?.root)) return error.root.message
  return null
}

/** Quantos erros há na árvore (cada campo conta uma vez). */
export function countErrors(errors) {
  if (!errors || typeof errors !== "object") return 0
  if (isFieldError(errors)) return 1
  let total = 0
  for (const value of Object.values(errors)) total += countErrors(value)
  return total
}

/**
 * Caminho do primeiro campo com erro, na ordem em que aparecem na tela.
 * `order`: nomes de campos e, para listas, `{ name, fields }` com a ordem dos
 * campos de cada linha. Numa lista, vale o 1º campo com erro da 1ª linha com
 * erro; sem erro nas linhas, o próprio nome da lista (erro da lista inteira).
 *
 * @param {object} errors formState.errors
 * @param {Array<string | { name: string, fields: string[] }>} order
 * @returns {string | null} ex.: "title", "items.2.quantity", "items"
 */
export function firstErrorPath(errors, order) {
  for (const entry of order) {
    const name = typeof entry === "string" ? entry : entry.name
    const error = errors?.[name]
    if (!error) continue
    if (typeof entry === "string") return name
    const length = Array.isArray(error) ? error.length : 0
    for (let index = 0; index < length; index++) {
      const field = entry.fields.find((key) => error[index]?.[key])
      if (field) return `${name}.${index}.${field}`
    }
    return name
  }
  return null
}
