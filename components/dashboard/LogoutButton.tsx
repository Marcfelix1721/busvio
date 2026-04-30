"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      className="border-white bg-transparent text-white hover:bg-white/10"
    >
      Cerrar sesion
    </Button>
  )
}
