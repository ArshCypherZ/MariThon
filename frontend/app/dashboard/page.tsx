"use client"
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import DashboardComponent from '@/components/Dashboard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

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
      toast.success('Voyage created successfully')
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

  const onRefresh = () => {
    refreshAlerts()
    refreshVoyages()
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <DashboardComponent
        alerts={alerts || []}
        voyages={voyages || []}
        onRefresh={onRefresh}
        onAddVoyage={() => setAdding(true)}
        fmtAlert={fmtAlert}
      />
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Voyage</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Voyage name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdding(false); setName('') }}>Cancel</Button>
            <Button onClick={createVoyage}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
