import { ConfirmationPage, confirmationMetadata } from "@/components/public-quote/confirmation-page"

export function generateMetadata({ params }) {
  return confirmationMetadata("approved", params)
}

/** Confirmação depois que o cliente aprova a proposta (aceite eletrônico). */
export default function ApprovedQuotePage({ params }) {
  return <ConfirmationPage decision="approved" params={params} />
}
