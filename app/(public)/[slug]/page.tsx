import { QuoteForm } from "@/components/forms/QuoteForm"

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <QuoteForm slug={slug} />
}
