import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Venu · Recupera las citas que pierdes por WhatsApp', template: '%s · Venu' },
  description:
    'El CRM automatizado que atiende WhatsApp 24/7 para tu clínica estética. Responde, califica y agenda. Sin que pierdas una cita más.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
