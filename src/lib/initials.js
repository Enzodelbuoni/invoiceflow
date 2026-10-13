/**
 * Iniciais para monogramas: "Ana Souza" → "AS", "Ana Maria Souza" → "AS",
 * "Estúdio" → "ES"; vazio → "?".
 */
export function initials(name) {
  const words = String(name ?? "").trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words.at(-1)[0]).toUpperCase()
}
