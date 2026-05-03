import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PublicThanksPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Solicitud recibida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Nos pondremos en contacto contigo en menos de 24 horas.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
