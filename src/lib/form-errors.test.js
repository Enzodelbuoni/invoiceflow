import { describe, expect, it } from "vitest"

import { countErrors, firstErrorPath, listErrorMessage } from "./form-errors"

const error = (message) => ({ type: "custom", message })

/** Array "esparso" como o RHF monta: só as linhas com erro têm objeto. */
function itemErrors(entries, root) {
  const list = []
  for (const [index, value] of Object.entries(entries)) list[index] = value
  if (root) list.root = root
  return list
}

const ORDER = ["client_id", "title", { name: "items", fields: ["name", "quantity", "unit_price"] }, "discount_value", "notes"]

describe("firstErrorPath", () => {
  it("sem erros → null", () => {
    expect(firstErrorPath({}, ORDER)).toBeNull()
    expect(firstErrorPath(undefined, ORDER)).toBeNull()
  })

  it("segue a ordem da tela, não a ordem das chaves do objeto", () => {
    expect(firstErrorPath({ notes: error("x"), title: error("y") }, ORDER)).toBe("title")
  })

  it("lista: 1º campo com erro da 1ª linha com erro, na ordem dos campos", () => {
    const errors = { items: itemErrors({ 2: { unit_price: error("a"), name: error("b") }, 4: { name: error("c") } }), notes: error("d") }
    expect(firstErrorPath(errors, ORDER)).toBe("items.2.name")
  })

  it("lista sem erro nas linhas: o nome da lista (erro da lista inteira)", () => {
    expect(firstErrorPath({ items: error("Adicione pelo menos um item.") }, ORDER)).toBe("items")
    expect(firstErrorPath({ items: itemErrors({}, error("Máximo de 100.")) }, ORDER)).toBe("items")
  })

  it("um campo antes da lista vence", () => {
    expect(firstErrorPath({ items: error("x"), client_id: error("y") }, ORDER)).toBe("client_id")
  })

  it("campos fora da ordem são ignorados", () => {
    expect(firstErrorPath({ other: error("x") }, ORDER)).toBeNull()
  })
})

describe("countErrors", () => {
  it("conta cada campo uma vez, inclusive dentro das listas", () => {
    const errors = {
      title: error("a"),
      items: itemErrors({ 0: { name: error("b"), quantity: error("c") }, 3: { unit_price: error("d") } }, error("e")),
    }
    expect(countErrors(errors)).toBe(5)
    expect(countErrors({})).toBe(0)
    expect(countErrors(undefined)).toBe(0)
  })

  it("não entra no `ref` do erro (elemento do DOM)", () => {
    expect(countErrors({ title: { type: "x", message: "a", ref: { focus() {}, nested: error("não conta") } } })).toBe(1)
  })
})

describe("listErrorMessage", () => {
  it("lê o erro da lista no objeto ou em root", () => {
    expect(listErrorMessage(error("Adicione pelo menos um item."))).toBe("Adicione pelo menos um item.")
    expect(listErrorMessage(itemErrors({}, error("Máximo de 100.")))).toBe("Máximo de 100.")
  })

  it("só erros das linhas, ou nada → null", () => {
    expect(listErrorMessage(itemErrors({ 0: { name: error("x") } }))).toBeNull()
    expect(listErrorMessage(undefined)).toBeNull()
  })
})
