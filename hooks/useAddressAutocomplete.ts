import { useEffect, useState } from "react"

type AddressSuggestion = {
  formatted: string
}

export function useAddressAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 3) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setIsLoading(true)

      try {
        const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY
        if (!apiKey) {
          setSuggestions([])
          return
        }

        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(trimmedQuery)}&apiKey=${apiKey}&lang=es&limit=5&filter=countrycode:es&format=json`,
          {
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          setSuggestions([])
          return
        }

        const data = (await response.json()) as { results?: AddressSuggestion[] }
        setSuggestions((data.results ?? []).map((item) => item.formatted))
      } catch {
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [query])

  return { suggestions, isLoading }
}
