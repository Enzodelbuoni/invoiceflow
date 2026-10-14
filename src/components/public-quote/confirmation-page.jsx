import { notFound, redirect } from "next/navigation"

import { PublicQuoteConfirmation } from "@/components/public-quote/public-quote-confirmation"
import { PublicQuoteShell } from "@/components/public-quote/public-quote-shell"
import { getPublicQuote } from "@/lib/data/public-quotes"

// Páginas de confirmação depois da resposta do cliente (Sprint 15):
// /quote/<id>/approved e /quote/<id>/declined. Quem abre uma delas sem que a
// proposta esteja nesse estado volta para a proposta.

const ROBOTS = { index: false, follow: false }
const TITLES = { approved: "Proposta aprovada", declined: "Resposta registrada" }

/** generateMetadata das duas páginas. */
export async function confirmationMetadata(decision, params) {
  const { publicId } = await params
  const data = await getPublicQuote(publicId)
  if (!data) return { title: "Proposta não encontrada", robots: ROBOTS }
  return { title: { absolute: `${TITLES[decision]} · ${data.issuer.name}` }, robots: ROBOTS }
}

/** Corpo das duas páginas. */
export async function ConfirmationPage({ decision, params }) {
  const { publicId } = await params
  const data = await getPublicQuote(publicId)
  if (!data) notFound()
  if (data.quote.status !== decision || data.response?.decision !== decision) redirect(`/quote/${publicId}`)

  const { quote, issuer, response, viewer_is_owner: viewerIsOwner } = data
  return (
    <PublicQuoteShell
      issuer={issuer}
      quoteNumber={quote.quote_number}
      viewerIsOwner={viewerIsOwner}
      mainClassName="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16"
    >
      <PublicQuoteConfirmation
        decision={decision}
        publicId={publicId}
        quote={quote}
        issuer={issuer}
        response={response}
      />
    </PublicQuoteShell>
  )
}
