// Validação de UUID sem dependências do servidor: usada nos schemas (que rodam
// no navegador e na Server Action) e na camada de dados.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Texto no formato de UUID? (ids vêm da URL e de formulários: validar antes de consultar.) */
export function isUuid(value) {
  return UUID_RE.test(String(value))
}
