import { useSyncExternalStore } from "react"

const noopSubscribe = () => () => {}

/**
 * `false` no servidor e durante a hidratação, `true` depois.
 * Use para ler valores que só existem no navegador (ex.: tema salvo)
 * sem causar divergência de hidratação.
 */
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}
