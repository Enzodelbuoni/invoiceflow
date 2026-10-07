"use client"

import { useRef } from "react"

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { editCurrencyInput, normalizeCurrencyInput, pasteIntoCurrencyInput } from "@/lib/currency-input"
import { MAX_PRICE_INTEGER_DIGITS } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * Campo de valor em reais ("R$ 1.500,00") para usar com o `register` do RHF.
 * O texto vira centavos no schema (parseCurrencyInput); aqui só cuidamos da
 * digitação. As regras ficam em lib/currency-input.js (testadas).
 *
 * A máscara é aplicada no próprio evento, ANTES de o RHF ler o valor: usar
 * setValue dentro do onChange faria o RHF pular a revalidação do campo.
 *
 * @param {{ registration: ReturnType<import("react-hook-form").UseFormRegister<any>>, maxIntegerDigits?: number }} props
 */
export function CurrencyInput({ registration, maxIntegerDigits = MAX_PRICE_INTEGER_DIGITS, className, ...props }) {
  const { name, ref, onChange, onBlur } = registration
  // Valor antes de cada edição: para recusar uma tecla (voltar ao anterior) e
  // para saber quando um ponto de milhar foi apagado.
  const previous = useRef("")

  function apply(input, value, caret) {
    input.value = value
    input.setSelectionRange(caret, caret)
    previous.current = value
  }

  function handleChange(event) {
    const input = event.target
    const { inputType, data } = event.nativeEvent
    const next = editCurrencyInput({
      previous: previous.current,
      value: input.value,
      caret: input.selectionStart ?? input.value.length,
      inputType,
      data,
      maxIntegerDigits,
    })
    apply(input, next.value, next.caret)
    if (!next.rejected) return onChange(event)
  }

  function handlePaste(event) {
    const input = event.currentTarget
    const result = pasteIntoCurrencyInput({
      value: input.value,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
      text: event.clipboardData.getData("text"),
      maxIntegerDigits,
    })
    if (!result) return // colagem parcial: o navegador cola e o handleChange mascara
    event.preventDefault()
    if (result.rejected) return
    apply(input, result.value, result.caret)
    return onChange({ target: input, type: "change" })
  }

  function handleBlur(event) {
    const input = event.target
    input.value = normalizeCurrencyInput(input.value)
    previous.current = input.value
    return onBlur(event)
  }

  return (
    <InputGroup className={cn("h-10", className)}>
      <InputGroupAddon>
        <span aria-hidden="true" className="tabular-nums">
          R$
        </span>
      </InputGroupAddon>
      <InputGroupInput
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        className="h-full tabular-nums"
        {...props}
        name={name}
        ref={ref}
        onFocus={(event) => {
          previous.current = event.target.value
        }}
        onChange={handleChange}
        onPaste={handlePaste}
        onBlur={handleBlur}
      />
    </InputGroup>
  )
}
