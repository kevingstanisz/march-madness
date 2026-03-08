import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'March Madness Draft',
  description: 'March Madness Draft & Standings',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="court-bg">
        {children}
      </body>
    </html>
  )
}
