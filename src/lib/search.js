// Busca local (no navegador) em listas já carregadas, como o seletor de clientes.
// Ignora acentos e maiúsculas: "estudio" acha "Estúdio Aurora".

/** Texto pronto para comparar: sem acentos, minúsculo e com espaços simples. */
export function normalizeSearchText(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/** Todas as palavras da busca aparecem no texto, em qualquer ordem? Busca vazia casa tudo. */
export function matchesSearch(text, query) {
  const words = normalizeSearchText(query).split(" ").filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalizeSearchText(text)
  return words.every((word) => haystack.includes(word))
}
