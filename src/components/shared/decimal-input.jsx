"use client"

import { useRef } from "react"

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { editCurrencyInput, normalizeCurrencyInput, pasteIntoCurrencyInput } from "@/lib/currency-input"
import { MAX_PRICE_INTEGER_DIGITS } from "@/lib/money"
import { editPercentInput, normalizePercentInput, pasteIntoPercentInput } from "@/lib/percent"
import { editQuantityInput, normalizeQuantityInput, pasteIntoQuantityInput } from "@/lib/quantity"
import { cn } from "@/lib/utils"

/**
 * Campo numérico com vírgula decimal ("1.500,00", "1,5") para usar com o
 * `register` do RHF. O texto vira número no schema; aqui só cuidamos da
 * digitação. As regras (`rules`) são funções puras testadas em lib/.
 *
 * A máscara é aplicada no próprio evento, ANTES de o RHF ler o valor: usar
 * setValue dentro do onChange faria o RHF pular a revalidação do campo.
 *
 * @param {{
 *   registration: ReturnType<import("react-hook-form").UseFormRegister<any>>,
 *   rules: { edit: Function, paste: Function, normalize: (text: string) => string },
 *   prefix?: string,   símbolo antes do número ("R$")
 *   suffix?: string,   símbolo depois do número ("%")
 * }} props
 */
function DecimalInput({ registration, rules, prefix, suffix, className, ...props }) {
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
    const next = rules.edit({
      previous: previous.current,
      value: input.value,
      caret: input.selectionStart ?? input.value.length,
      inputType,
      data,
    })
    apply(input, next.value, next.caret)
    if (!next.rejected) return onChange(event)
  }

  function handlePaste(event) {
    const input = event.currentTarget
    const result = rules.paste({
      value: input.value,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd,
      text: event.clipboardData.getData("text"),
    })
    if (!result) return // colagem parcial: o navegador cola e o handleChange mascara
    event.preventDefault()
    if (result.rejected) return
    apply(input, result.value, result.caret)
    return onChange({ target: input, type: "change" })
  }

  function handleBlur(event) {
    const input = event.target
    input.value = rules.normalize(input.value)
    previous.current = input.value
    return onBlur(event)
  }

  return (
    <InputGroup className={cn("h-10", className)}>
      {prefix && (
        <InputGroupAddon>
          <span aria-hidden="true" className="tabular-nums">
            {prefix}
          </span>
        </InputGroupAddon>
      )}
      <InputGroupInput
        type="text"
        inputMode="decimal"
        autoComplete="off"
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
      {suffix && (
        <InputGroupAddon align="inline-end">
          <span aria-hidden="true" className="tabular-nums">
            {suffix}
          </span>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

/**
 * Valor em reais ("R$ 1.500,00"). Regras em lib/currency-input.js; o schema
 * converte o texto em centavos (parseCurrencyInput).
 */
export function CurrencyInput({ maxIntegerDigits = MAX_PRICE_INTEGER_DIGITS, ...props }) {
  const rules = {
    edit: (edit) => editCurrencyInput({ ...edit, maxIntegerDigits }),
    paste: (paste) => pasteIntoCurrencyInput({ ...paste, maxIntegerDigits }),
    normalize: normalizeCurrencyInput,
  }
  return <DecimalInput placeholder="0,00" prefix="R$" rules={rules} {...props} />
}

const QUANTITY_RULES = Object.freeze({
  edit: editQuantityInput,
  paste: pasteIntoQuantityInput,
  normalize: normalizeQuantityInput,
})

/** Quantidade com até 2 casas ("1,5"). Regras em lib/quantity.js (centésimos). */
export function QuantityInput(props) {
  return <DecimalInput placeholder="1" rules={QUANTITY_RULES} {...props} />
}

const PERCENT_RULES = Object.freeze({
  edit: editPercentInput,
  paste: pasteIntoPercentInput,
  normalize: normalizePercentInput,
})

/** Percentual de 0 a 100 com até 2 casas ("12,5 %"). Regras em lib/percent.js (pontos-base). */
export function PercentInput(props) {
  return <DecimalInput placeholder="0" suffix="%" rules={PERCENT_RULES} {...props} />
}
