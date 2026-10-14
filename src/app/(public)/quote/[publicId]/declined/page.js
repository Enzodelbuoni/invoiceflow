import { ConfirmationPage, confirmationMetadata } from "@/components/public-quote/confirmation-page"

export function generateMetadata({ params }) {
  return confirmationMetadata("declined", params)
}

/** Confirmação depois que o cliente recusa a proposta. */
export default function DeclinedQuotePage({ params }) {
  return <ConfirmationPage decision="declined" params={params} />
}
