/**
 * Enter num campo de texto não envia o formulário (o envio é só pelo botão):
 * num formulário grande, um Enter sem querer mostraria erros em tudo. Vale só
 * para os campos do próprio formulário: os diálogos de cadastro rápido estão
 * em portais, e o evento chega aqui pela árvore do React, não pela do DOM.
 * Usar como `onKeyDown` do <form> (construtor de orçamentos, editor de modelos).
 */
export function preventImplicitSubmit(event) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return
  const target = event.target
  if (target instanceof HTMLInputElement && event.currentTarget.contains(target)) event.preventDefault()
}
