import Link from 'next/link'

export default function Home() {
  return (
    <main className="container">
      <div className="card text-center py-12">
        <div className="text-2xl font-semibold mb-2">MariThon</div>
        <div className="text-neutral-600 dark:text-neutral-400 mb-6">Voyage Document Analyzer — highlights clauses and alerts automatically</div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/sign-in" className="btn">Get Started</Link>
          <Link href="/dashboard" className="btn" prefetch>Skip sign-in</Link>
        </div>
      </div>
    </main>
  )
}
