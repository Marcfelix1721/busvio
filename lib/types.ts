export type Company = {
  id: string
  name: string
  slug: string
  email: string
  phone: string
  logo_url?: string
  created_at: string
}

export type QuoteRequest = {
  id: string
  company_id: string
  status:
    | "nuevo"
    | "en_revision"
    | "enviado"
    | "aceptado"
    | "rechazado"
    | "cancelado"
  requester_name: string
  requester_email: string
  requester_phone: string
  origin: string
  destination: string
  stops?: string
  trip_date: string
  departure_time: string
  passengers: number
  vehicle_type: "minibus" | "autobus" | "autocar"
  comments?: string
  estimated_price?: number
  final_price?: number
  internal_notes?: string
  created_at: string
  updated_at: string
}

export type PricingSettings = {
  id: string
  company_id: string
  base_price: number
  price_per_km: number
  garage_address: string
  updated_at: string
}
