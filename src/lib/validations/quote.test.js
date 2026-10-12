import { describe, expect, it } from "vitest"

import { SERVICE_UNIT_VALUES } from "@/lib/constants/service-units"
import { MAX_TOTAL_CENTS } from "@/lib/calculations/quote"
import { MAX_PRICE_CENTS, formatCurrency } from "@/lib/money"

import {
  DEFAULT_ITEM_UNIT,
  DISCOUNT_TYPE,
  QUOTE_LIMITS,
  createEmptyQuoteForm,
  createQuoteItem,
  createQuoteSchema,
} from "./quote"
import { serviceSchema } from "./service"

describe("createEmptyQuoteForm", () => {
  it("começa sem itens, sem desconto, sem imposto e com validade de 15 dias", () => {
    const form = createEmptyQuoteForm({ today: "2026-10-12" })
    expect(form.items).toEqual([])
    expect(form.valid_until).toBe("2026-10-27")
    expect(form).toMatchObject({ discount_type: DISCOUNT_TYPE.NONE, discount_value: "", tax_enabled: false, tax_rate: "" })
  })
})

describe("createQuoteItem", () => {
  it("item avulso: campos vazios, quantidade 1 e unidade padrão", () => {
    expect(createQuoteItem()).toEqual({
      service_id: "",
      name: "",
      description: "",
      quantity: "1",
      unit: DEFAULT_ITEM_UNIT,
      unit_price: "",
    })
    expect(SERVICE_UNIT_VALUES).toContain(DEFAULT_ITEM_UNIT)
  })

  it("do catálogo: copia nome, descrição, unidade e preço do serviço (snapshot)", () => {
    const service = {
      id: "6f1c1d2e-0000-4000-8000-000000000001",
      name: "Design de landing page",
      description: "Layout responsivo com 2 rodadas de ajustes.",
      unit: "project",
      price_cents: 480000,
    }
    expect(createQuoteItem(service)).toEqual({
      service_id: service.id,
      name: "Design de landing page",
      description: "Layout responsivo com 2 rodadas de ajustes.",
      quantity: "1",
      unit: "project",
      unit_price: "4.800,00",
    })
  })

  it("serviço sem descrição vira descrição vazia (campo de texto)", () => {
    const item = createQuoteItem({ id: "x", name: "Hora técnica", description: null, unit: "hour", price_cents: 15000 })
    expect(item.description).toBe("")
    expect(item.unit_price).toBe("150,00")
  })

  it("nenhum serviço válido do catálogo passa dos limites do item", () => {
    const service = (name, description) => serviceSchema.safeParse({ name, description, unit: "hour", price: "1,00" })
    // O maior serviço que o catálogo aceita cabe no item…
    expect(service("N".repeat(QUOTE_LIMITS.itemNameMax), "D".repeat(QUOTE_LIMITS.itemDescription)).success).toBe(true)
    // …e um caractere a mais o catálogo já recusa.
    expect(service("N".repeat(QUOTE_LIMITS.itemNameMax + 1), "").success).toBe(false)
    expect(service("Nome", "D".repeat(QUOTE_LIMITS.itemDescription + 1)).success).toBe(false)
  })

  it("um item criado do catálogo já passa no schema do orçamento", () => {
    const schema = createQuoteSchema({ today: "2026-10-12" })
    const item = createQuoteItem({
      id: "6f1c1d2e-0000-4000-8000-000000000001",
      name: "Hora técnica",
      description: null,
      unit: "hour",
      price_cents: 15000,
    })
    const result = schema.safeParse({
      ...createEmptyQuoteForm({ today: "2026-10-12" }),
      client_id: "6f1c1d2e-0000-4000-8000-000000000009",
      title: "Suporte",
      items: [item],
    })
    expect(result.success).toBe(true)
  })
})

describe("createQuoteSchema", () => {
  const TODAY = "2026-10-12"
  const schema = createQuoteSchema({ today: TODAY })
  const CLIENT = "6f1c1d2e-0000-4000-8000-000000000001"
  const SERVICE = "6f1c1d2e-0000-4000-8000-000000000002"

  const item = (overrides = {}) => ({
    service_id: "",
    name: "Hospedagem anual",
    description: "",
    quantity: "1",
    unit: "unit",
    unit_price: "359,90",
    ...overrides,
  })

  const valid = (overrides = {}) => ({
    ...createEmptyQuoteForm({ today: TODAY }),
    client_id: CLIENT,
    title: "Site institucional",
    items: [item()],
    ...overrides,
  })

  /** Primeira mensagem de cada caminho ("items.0.name"), como o formulário mostra. */
  function errorsOf(values) {
    const result = schema.safeParse(values)
    if (result.success) return null
    const errors = {}
    for (const issue of result.error.issues) errors[issue.path.join(".")] ??= issue.message
    return errors
  }

  describe("saída no formato do banco", () => {
    it("converte textos em inteiros e campos vazios em null", () => {
      const output = schema.parse(
        valid({
          title: "  Site institucional  ",
          description: "  Novo site  ",
          items: [
            item({
              service_id: SERVICE,
              name: "Design",
              description: "2 rodadas",
              quantity: "1,5",
              unit: "hour",
              unit_price: "1.500,00",
            }),
            item(),
          ],
          discount_type: DISCOUNT_TYPE.PERCENT,
          discount_value: "12,5",
          tax_enabled: true,
          tax_rate: "5",
          notes: "",
          terms: "  50% na aprovação  ",
        }),
      )
      expect(output).toEqual({
        client_id: CLIENT,
        title: "Site institucional",
        description: "Novo site",
        valid_until: "2026-10-27",
        items: [
          {
            service_id: SERVICE,
            name: "Design",
            description: "2 rodadas",
            quantity_hundredths: 150,
            unit: "hour",
            unit_price_cents: 150000,
          },
          {
            service_id: null,
            name: "Hospedagem anual",
            description: null,
            quantity_hundredths: 100,
            unit: "unit",
            unit_price_cents: 35990,
          },
        ],
        discount_type: "percent",
        discount_value: 1250,
        tax_rate_bps: 500,
        notes: null,
        terms: "50% na aprovação",
      })
    })

    it("desconto em valor fixo vira centavos", () => {
      const output = schema.parse(valid({ discount_type: DISCOUNT_TYPE.AMOUNT, discount_value: "350,00" }))
      expect(output).toMatchObject({ discount_type: "amount", discount_value: 35000 })
    })

    it("sem desconto e sem imposto: null, ignorando o texto que sobrou nos campos", () => {
      const output = schema.parse(
        valid({ discount_type: DISCOUNT_TYPE.NONE, discount_value: "abc", tax_enabled: false, tax_rate: "xyz" }),
      )
      expect(output).toMatchObject({ discount_type: null, discount_value: null, tax_rate_bps: null })
    })

    it("descarta campos extras (não dá para injetar user_id, status ou totais)", () => {
      const output = schema.parse({
        ...valid(),
        user_id: "outro",
        status: "approved",
        total: 1,
        items: [{ ...item(), id: "x", subtotal: 1 }],
      })
      expect(Object.keys(output).sort()).toEqual([
        "client_id",
        "description",
        "discount_type",
        "discount_value",
        "items",
        "notes",
        "tax_rate_bps",
        "terms",
        "title",
        "valid_until",
      ])
      expect(Object.keys(output.items[0]).sort()).toEqual([
        "description",
        "name",
        "quantity_hundredths",
        "service_id",
        "unit",
        "unit_price_cents",
      ])
    })
  })

  describe("campos obrigatórios", () => {
    it("formulário vazio: cliente, título e itens", () => {
      expect(errorsOf(createEmptyQuoteForm({ today: TODAY }))).toEqual({
        client_id: "Escolha quem vai receber a proposta.",
        title: "Dê um título ao orçamento.",
        items: "Adicione pelo menos um item ao orçamento.",
      })
    })

    it("cliente precisa ser um id válido", () => {
      expect(errorsOf(valid({ client_id: "abc" }))).toEqual({ client_id: "Escolha quem vai receber a proposta." })
    })

    it("limites de texto (contados como o Postgres)", () => {
      expect(errorsOf(valid({ title: "😀".repeat(121) }))).toEqual({ title: "O título pode ter no máximo 120 caracteres." })
      expect(errorsOf(valid({ title: "😀".repeat(120) }))).toBeNull()
      expect(errorsOf(valid({ description: "a".repeat(2001) }))).toEqual({
        description: "A descrição pode ter no máximo 2000 caracteres.",
      })
      expect(errorsOf(valid({ notes: "a".repeat(2001) }))).toEqual({
        notes: "As observações pode ter no máximo 2000 caracteres.",
      })
      expect(errorsOf(valid({ terms: "a".repeat(4001) }))).toEqual({ terms: "Os termos pode ter no máximo 4000 caracteres." })
    })
  })

  describe("validade", () => {
    it.each([
      ["", "Informe até quando a proposta vale."],
      ["2026-02-31", "Informe uma data válida."],
      ["12/10/2026", "Informe uma data válida."],
      ["2026-10-11", "A validade não pode ser antes de hoje."],
      ["2027-10-13", "A validade pode ser de até 1 ano (12 de out. de 2027)."],
    ])("%j → %s", (date, message) => {
      expect(errorsOf(valid({ valid_until: date }))).toEqual({ valid_until: message })
    })

    it.each(["2026-10-12", "2027-10-12"])("%s (hoje e daqui a 1 ano) vale", (date) => {
      expect(errorsOf(valid({ valid_until: date }))).toBeNull()
    })
  })

  describe("itens", () => {
    it.each([
      [{ name: "" }, "items.0.name", "Informe o nome do item."],
      [{ name: "N".repeat(121) }, "items.0.name", "O nome pode ter no máximo 120 caracteres."],
      [{ description: "D".repeat(1001) }, "items.0.description", "A descrição pode ter no máximo 1000 caracteres."],
      [{ quantity: "" }, "items.0.quantity", "Informe a quantidade."],
      [{ quantity: "0" }, "items.0.quantity", "A quantidade precisa ser maior que zero."],
      [{ quantity: "0,00" }, "items.0.quantity", "A quantidade precisa ser maior que zero."],
      [{ quantity: "abc" }, "items.0.quantity", "Digite uma quantidade válida, como 1 ou 1,5."],
      [{ quantity: "1.000.000" }, "items.0.quantity", "A quantidade pode ser no máximo 999.999,99."],
      [{ unit: "dozen" }, "items.0.unit", "Escolha a unidade."],
      [{ unit_price: "" }, "items.0.unit_price", "Informe o preço unitário."],
      [{ unit_price: "1,2,3" }, "items.0.unit_price", "Digite um valor válido, como 1.500,00."],
      // (o Intl separa "R$" do número com espaço não separável)
      [{ unit_price: "100.000.000,00" }, "items.0.unit_price", `O preço pode ser no máximo ${formatCurrency(MAX_PRICE_CENTS)}.`],
      [{ service_id: "abc" }, "items.0.service_id", "Serviço inválido."],
    ])("%j → %s: %s", (overrides, path, message) => {
      expect(errorsOf(valid({ items: [item(overrides)] }))).toEqual({ [path]: message })
    })

    it("preço zero é permitido (item de cortesia)", () => {
      expect(schema.parse(valid({ items: [item({ unit_price: "0,00" })] })).items[0].unit_price_cents).toBe(0)
    })

    it("o erro aponta o item certo", () => {
      expect(errorsOf(valid({ items: [item(), item({ quantity: "0" })] }))).toEqual({
        "items.1.quantity": "A quantidade precisa ser maior que zero.",
      })
    })

    describe("teto de valores (R$ 999.999.999,99)", () => {
      const limit = formatCurrency(MAX_TOTAL_CENTS)

      it("item acima do teto: erro no preço daquele item", () => {
        expect(errorsOf(valid({ items: [item(), item({ quantity: "999.999,99", unit_price: "99.999.999,99" })] }))).toEqual({
          "items.1.unit_price": `O total deste item passa do limite de ${limit}.`,
        })
      })

      it("soma dos itens acima do teto: erro na lista", () => {
        const big = item({ quantity: "10", unit_price: "99.999.999,99" }) // R$ 999.999.999,90
        expect(errorsOf(valid({ items: [big, item()] }))).toEqual({ items: `A soma dos itens passa do limite de ${limit}.` })
      })

      it("imposto levando o total acima do teto: erro na alíquota", () => {
        const big = item({ quantity: "10", unit_price: "99.999.999,99" })
        expect(errorsOf(valid({ items: [big], tax_enabled: true, tax_rate: "1" }))).toEqual({
          tax_rate: `Com o imposto, o total passa do limite de ${limit}.`,
        })
      })

      it("a checagem dos totais só roda quando os campos estão válidos", () => {
        expect(errorsOf(valid({ title: "", discount_type: DISCOUNT_TYPE.AMOUNT, discount_value: "999,00" }))).toEqual({
          title: "Dê um título ao orçamento.",
        })
      })
    })

    it(`no máximo ${QUOTE_LIMITS.items} itens`, () => {
      expect(errorsOf(valid({ items: Array.from({ length: QUOTE_LIMITS.items }, () => item()) }))).toBeNull()
      expect(errorsOf(valid({ items: Array.from({ length: QUOTE_LIMITS.items + 1 }, () => item()) }))).toEqual({
        items: `O orçamento pode ter no máximo ${QUOTE_LIMITS.items} itens.`,
      })
    })
  })

  describe("desconto e imposto", () => {
    const discount = (type, value) => errorsOf(valid({ discount_type: type, discount_value: value }))
    const tax = (value) => errorsOf(valid({ tax_enabled: true, tax_rate: value }))
    const REMOVE = "Para não aplicar, remova-o."

    it.each([
      [DISCOUNT_TYPE.PERCENT, "", "Informe o percentual de desconto."],
      [DISCOUNT_TYPE.PERCENT, "0", `O desconto precisa ser maior que zero. ${REMOVE}`],
      [DISCOUNT_TYPE.PERCENT, "100,01", "O desconto pode ser no máximo 100%."],
      [DISCOUNT_TYPE.PERCENT, "abc", "Digite um percentual válido, como 10 ou 12,5."],
      [DISCOUNT_TYPE.AMOUNT, "", "Informe o valor do desconto."],
      [DISCOUNT_TYPE.AMOUNT, "0,00", `O desconto precisa ser maior que zero. ${REMOVE}`],
      [DISCOUNT_TYPE.AMOUNT, "abc", "Digite um valor válido, como 1.500,00."],
    ])("desconto %s %j → %s", (type, value, message) => {
      expect(discount(type, value)).toEqual({ discount_value: message })
    })

    it("desconto de 100% é permitido", () => {
      expect(discount(DISCOUNT_TYPE.PERCENT, "100")).toBeNull()
    })

    it("tipo de desconto desconhecido", () => {
      expect(discount("bonus", "10")).toEqual({ discount_type: "Escolha o tipo de desconto." })
    })

    it.each([
      ["", "Informe a alíquota."],
      ["0", `A alíquota precisa ser maior que zero. ${REMOVE}`],
      ["101", "A alíquota pode ser no máximo 100%."],
    ])("imposto %j → %s", (value, message) => {
      expect(tax(value)).toEqual({ tax_rate: message })
    })

    it("desconto fixo não pode passar do subtotal (igual ao subtotal pode)", () => {
      // 1 × R$ 359,90
      expect(discount(DISCOUNT_TYPE.AMOUNT, "359,91")).toEqual({
        discount_value: `O desconto não pode ser maior que o subtotal (${formatCurrency(35990)}).`,
      })
      expect(discount(DISCOUNT_TYPE.AMOUNT, "359,90")).toBeNull()
    })

    it("erros de desconto e imposto aparecem junto com os dos outros campos", () => {
      expect(
        errorsOf({ ...createEmptyQuoteForm({ today: TODAY }), discount_type: DISCOUNT_TYPE.PERCENT, tax_enabled: true }),
      ).toEqual({
        client_id: "Escolha quem vai receber a proposta.",
        title: "Dê um título ao orçamento.",
        items: "Adicione pelo menos um item ao orçamento.",
        discount_value: "Informe o percentual de desconto.",
        tax_rate: "Informe a alíquota.",
      })
    })
  })
})
