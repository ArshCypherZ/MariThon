"use client"
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { toast } from 'sonner'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function Dashboard() {
  const wsId = 1
  const { data: alerts, isLoading, mutate: refreshAlerts } = useSWR(`${API_BASE}/workspaces/${wsId}/alerts`, fetcher)
  const { data: voyages, mutate: refreshVoyages } = useSWR(`${API_BASE}/workspaces/${wsId}/voyages`, fetcher)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const createVoyage = async () => {
    if (!name.trim()) return
    const params = new URLSearchParams({ name })
    const res = await fetch(`${API_BASE}/workspaces/${wsId}/voyages?` + params.toString(), { method: 'POST' })
    if (res.ok) {
      setName('')
      setAdding(false)
      refreshVoyages()
    } else {
      toast.error('Failed to create voyage')
    }
  }

  const fmtAlert = (a: any) => {
    try {
      const m = a.message.match(/NOR\s+(\d{4}-\d{2}-\d{2}).*Laycan window:\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i)
      const toHuman = (s: string) => new Date(s + 'T00:00:00Z').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
      if (m) {
        const nor = toHuman(m[1]).replace(',', '')
        const start = toHuman(m[2]).replace(',', '').replace(/\s(\d{4})$/, '')
        const end = toHuman(m[3]).replace(',', '')
        const endShort = end.replace(/\s(\d{4})$/, '')
        return `NOR tendered on ${nor} is outside the allowed laycan window (${start}–${endShort}).`
      }
    } catch {}
    return a.message
  }

  return (
    <main className="container space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alerts</h2>
        <div className="flex gap-2">
          <button className="btn" onClick={() => { refreshAlerts(); refreshVoyages() }}>Refresh</button>
          {!adding ? (
            <button className="btn" onClick={() => setAdding(true)}>Add Voyage</button>
          ) : (
            <div className="flex gap-2 items-center">
              <input className="input w-[28ch] sm:w-[36ch]" placeholder="Voyage name" value={name} onChange={e => setName(e.target.value)} />
              <button className="btn" onClick={createVoyage}>Create</button>
              <button className="btn" onClick={() => { setAdding(false); setName('') }}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading && <div className="card">Loading alerts…</div>}
        {alerts?.map((a: any) => (
          <div key={a.id} className="card">
            <div className="mb-2 text-sm text-neutral-500">{new Date(a.created_at).toLocaleString()}</div>
            <div className="font-medium mb-2">⚠️ Laycan Inconsistency</div>
            <div className="mb-3 text-sm">{fmtAlert(a)}</div>
            <div className="flex gap-2">
              <Link href={`/voyages/${a.voyage_id}?alertId=${a.id}&mode=alert`} className="btn">View</Link>
              <Link href={`/voyages/${a.voyage_id}?docId=${a.document_id}`} className="btn">Open Document</Link>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="font-medium">Voyages</div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {voyages?.map((v: any) => (
            <li key={v.id} className="card flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{v.name}</div>
                <div className="text-xs text-neutral-500">ID: {v.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <NOREditor voyageId={v.id} />
                <Link className="btn" href={`/voyages/${v.id}`}>Open</Link>
                <button
                  className="btn"
                  onClick={async () => {
                    if (typeof window !== 'undefined' && !window.confirm('Delete this voyage and all its data?')) return
                    const res = await fetch(`${API_BASE}/workspaces/${wsId}/voyages/${v.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      toast.success('Voyage deleted')
                      refreshVoyages()
                      refreshAlerts()
                    } else {
                      toast.error('Failed to delete voyage')
                    }
                  }}
                >Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

function NOREditor({ voyageId }: { voyageId: number }) {
  const [nor, setNor] = useState<string>('')
  const { data, mutate } = useSWR(`${API_BASE}/voyages/${voyageId}/nor`, fetcher)
  const [saving, setSaving] = useState(false)

  const current = data?.nor_date || ''

  return (
    <form className="flex items-center gap-1" onSubmit={async (e) => {
      e.preventDefault()
      if (!nor.trim()) return
      setSaving(true)
      try {
        const res = await fetch(`${API_BASE}/voyages/${voyageId}/nor`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nor_date: nor.trim() })
        })
        if (res.ok) {
          toast.success('NOR updated')
          setNor('')
          mutate()
        } else {
          toast.error('Failed to update NOR')
        }
      } finally {
        setSaving(false)
      }
    }}>
      <input
        type="date"
        className="input w-[16ch]"
        value={nor}
        placeholder={current}
        onChange={(e) => setNor(e.target.value)}
      />
      <button className="btn" disabled={saving || !nor.trim()} type="submit">Set NOR</button>
    </form>
  )
}
