import { PlusIcon } from "lucide-react"

import { SectionHeading } from "@/components/landing/section-heading"

const QUESTIONS = [
  {
    question: "Meu cliente precisa criar conta?",
    answer:
      "Não. Ele recebe o link da proposta e abre no navegador, no celular ou no computador. Para aprovar, informa o nome e o e-mail.",
  },
  {
    question: "Como funciona o aceite eletrônico?",
    answer:
      "O cliente digita o nome, informa o e-mail e confirma que leu e aceita a proposta. Ficam registrados a data e a hora, o endereço IP e o navegador, e o aceite aparece no documento e no PDF. É um registro simples de concordância: se o seu contrato exigir assinatura com certificado digital, use uma ferramenta própria para isso.",
  },
  {
    question: "Os cálculos são confiáveis?",
    answer:
      "Sim. Os valores são guardados em centavos e calculados sempre do mesmo jeito, na tela e no servidor: subtotal por item, desconto em percentual ou valor fixo e impostos sobre o valor com desconto.",
  },
  {
    question: "Posso alterar uma proposta depois de enviar?",
    answer:
      "Depois do envio, a proposta fica congelada, para o cliente ver exatamente o que você mandou. Precisa mudar algo? Duplique como um novo rascunho, ajuste e envie de novo.",
  },
  {
    question: "O que acontece quando a validade termina?",
    answer:
      "A proposta passa para “Expirada” sozinha e o cliente não consegue mais aprovar. Se quiser, duplique e envie uma versão com a nova validade.",
  },
  {
    question: "Posso usar a minha logo e as minhas cores?",
    answer:
      "Sim. Em Configurações você envia a logo, escolhe a cor de destaque e preenche os dados do negócio que aparecem no topo de cada proposta.",
  },
]

/** Perguntas frequentes (details/summary nativos: abrem pelo teclado e funcionam sem JavaScript). */
export function Faq() {
  return (
    <section id="perguntas" aria-labelledby="perguntas-title" className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <SectionHeading
          id="perguntas-title"
          eyebrow="Perguntas frequentes"
          title="Ficou alguma dúvida?"
          align="start"
          className="lg:sticky lg:top-28 lg:self-start"
        >
          O essencial sobre como o InvoiceFlow funciona para você e para o seu cliente.
        </SectionHeading>

        <div className="border-t">
          {QUESTIONS.map(({ question, answer }) => (
            <details key={question} className="faq-item group border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-md py-5 text-left font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                {question}
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-card text-muted-foreground transition-[rotate,color] duration-300 ease-out-expo group-open:rotate-45 group-open:text-foreground"
                >
                  <PlusIcon className="size-3.5" />
                </span>
              </summary>
              <p className="pr-12 pb-6 text-pretty text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
