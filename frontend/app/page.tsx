import Link from 'next/link'

export default function Home() {
  return (
    <main className="container">
      <div className="card">
        <h2 className="text-lg font-medium mb-2">Welcome</h2>
        <p className="mb-4">Go to your dashboard to view alerts.</p>
        <Link href="/dashboard" className="btn">Open Dashboard</Link>
      </div>
    </main>
  )
}
