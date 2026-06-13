import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Titulares: grotesca geométrica con carácter. Cuerpo: legible y neutra.
const fontDisplay = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const fontBody = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlotaFly — Presupuestos de autocar automáticos en segundos",
  description:
    "FlotaFly calcula solo el precio real de cada servicio de autocar —kilómetros desde tu garaje, combustible, conductor, peajes y tu margen— y envía un PDF con tu marca al cliente. Comparte un enlace y deja de calcular a mano.",
  icons: { icon: "/logo-flotafly.svg" },
  openGraph: {
    title: "FlotaFly — Presupuestos de autocar automáticos en segundos",
    description:
      "Deja de calcular presupuestos a mano. FlotaFly calcula el precio real con la lógica de tu garaje y envía el PDF con tu marca al instante.",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${fontDisplay.variable} ${fontBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
