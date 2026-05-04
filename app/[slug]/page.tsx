import { redirect } from 'next/navigation'
import { QuoteForm } from "@/components/forms/QuoteForm"

const RESERVED_SLUGS = ['registro', 'onboarding', 'login', 'dashboard', 'demo']

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (RESERVED_SLUGS.includes(slug)) {
    redirect(`/${slug}`)
  }

  return <QuoteForm slug={slug} />
}