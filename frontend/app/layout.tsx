import './globals.css'
import { ClerkProvider, UserButton } from '@clerk/nextjs'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'MariThon',
  description: 'Clause insights and alerts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const AppShell = (
    <html lang="en">
      <body>
        <div className="container py-6">
          <header className="mb-6 flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">MariThon</Link>
            <div className="flex items-center gap-3">
              {publishableKey ? <UserButton afterSignOutUrl="/" /> : null}
            </div>
          </header>
          {children}
        </div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
  if (!publishableKey) return AppShell
  return (
    <ClerkProvider publishableKey={publishableKey}>
      {AppShell}
    </ClerkProvider>
  )
}
