import type { Metadata } from 'next'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'ETALASE'

  return {
    title: `${title} — Arsip Jurnal Bawaslu Kebumen`,
    description: 'Portal arsip publik read-only untuk kegiatan dan pimpinan Bawaslu Kebumen.',
    icons: {
      icon: '/assets/logo.png',
      shortcut: '/assets/logo.png',
      apple: '/assets/logo.png',
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className="font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
