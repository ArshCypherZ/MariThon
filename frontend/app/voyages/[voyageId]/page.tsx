"use client"
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import DocumentViewer from '@/components/DocumentViewer'
import { useSearchParams, useParams } from 'next/navigation'
import { toast } from 'sonner'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function VoyagePage() {
  const params = useParams()
  const voyageId = Number(params.voyageId)
  const search = useSearchParams()
  const alertId = search.get('alertId')
  const mode = search.get('mode') // 'alert' to show only alert evidence
  const docIdParamRaw = search.get('docId')
  const docIdParam = docIdParamRaw ? Number(docIdParamRaw) : null

  const { data: voyage, mutate } = useSWR(`${API_BASE}/voyages/${voyageId}`, fetcher, { refreshInterval: 5000 })
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [manualSelection, setManualSelection] = useState(false)
  const { data: doc } = useSWR(selectedDocId ? `${API_BASE}/documents/${selectedDocId}` : null, fetcher, { refreshInterval: 5000 })
  const { data: clauses, mutate: refreshClauses } = useSWR(selectedDocId ? `${API_BASE}/documents/${selectedDocId}/clauses` : null, fetcher)
  const { data: alertData } = useSWR(alertId ? `${API_BASE}/alerts/${alertId}` : null, fetcher)
  const { data: norData, mutate: refreshNOR } = useSWR(`${API_BASE}/voyages/${voyageId}/nor`, fetcher)

  useEffect(() => {
    if (voyage && selectedDocId === null) {
      const docs = voyage.documents || []
      if (docs.length) {
        const preferred = docIdParam && docs.some((d: any) => d.id === docIdParam) ? docIdParam : docs[0].id
        setSelectedDocId(preferred as number)
      }
    }
  }, [voyage, selectedDocId, docIdParam])

  useEffect(() => {
    if (!alertData || manualSelection) return
    if (alertData.document_id && selectedDocId !== alertData.document_id) {
      setSelectedDocId(alertData.document_id)
    }
  }, [alertData, selectedDocId, manualSelection])

  useEffect(() => {
    // Notify when processing completes
    if (doc?.status === 'ready') {
      toast.success('Insights ready for this document')
      // revalidate clauses so highlights show up
      refreshClauses()
    }
  }, [doc?.status, refreshClauses])

  useEffect(() => {
    // when user switches docs, fetch fresh clauses
    if (selectedDocId) {
      refreshClauses()
    }
  }, [selectedDocId, refreshClauses])

  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      const wsId = 1
      const form = new FormData()
      form.append('file', f)
      const res = await fetch(`${API_BASE}/workspaces/${wsId}/voyages/${voyageId}/documents`, { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      toast.success('✅ Upload successful! Processing document...')
      mutate()
    } catch (e) {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const clauseRanges = useMemo(() => (clauses||[]).map((c: any) => ({ range: [c.start_offset, c.end_offset] as [number, number], type: c.type as 'laytime' | 'demurrage' })), [clauses])
  const focusRangeFromAlert = useMemo(() => {
    if (!alertData?.evidence_offsets) return undefined
    try {
      const arr = JSON.parse(alertData.evidence_offsets)
      if (Array.isArray(arr) && arr.length && Array.isArray(arr[0]) && arr[0].length === 2) {
        return [arr[0][0], arr[0][1]] as [number, number]
      }
    } catch {}
    return undefined
  }, [alertData])

  const [focusRangeLocal, setFocusRangeLocal] = useState<[number, number] | undefined>(undefined)

  const renderedRanges = useMemo(() => {
    if (mode === 'alert' && focusRangeFromAlert) {
      return [{ range: focusRangeFromAlert, type: 'alert' as const }]
    }
    return clauseRanges
  }, [mode, focusRangeFromAlert, clauseRanges])

  const focusRange = focusRangeLocal || focusRangeFromAlert

  const docsCount = voyage?.documents?.length || 0

  const statusBadge = (s?: string) => {
    const base = 'badge'
    const map: Record<string, string> = {
      processing: ' bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
      ready: ' bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
      error: ' bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200'
    }
    const key = (s || '').toLowerCase()
    return <span className={base + (map[key] || '')}>{s}</span>
  }

  return (
    <main className="container space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{voyage?.name || `Voyage ${voyageId}`}</h2>
        <label className="btn">
          <input type="file" className="hidden" onChange={handleUpload} />
          {uploading ? (<span className="inline-flex items-center gap-2"><span className="spinner" />Uploading…</span>) : 'Upload Document'}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <div className="card">
            <div className="font-medium mb-2">Voyage Settings</div>
            <NOREditorInline voyageId={voyageId} currentNOR={norData?.nor_date} onSaved={() => { toast.success('NOR updated'); refreshNOR() }} />
          </div>
          <div className="card">
            <div className="font-medium mb-2">Documents</div>
            <ul className="space-y-2">
              {voyage?.documents?.map((d: any) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <button onClick={() => { setSelectedDocId(d.id); setManualSelection(true) }} className={`flex-1 text-left ${selectedDocId === d.id ? 'font-semibold' : ''}`}>
                    {d.filename} <span className="ml-2">{statusBadge(d.status)}</span>
                  </button>
                  {d.status === 'processing' && <span className="spinner" />}
                  <button
                    className="btn"
                    onClick={async () => {
                      if (typeof window !== 'undefined' && !window.confirm('Delete this document?')) return
                      try {
                        const res = await fetch(`${API_BASE}/workspaces/1/voyages/${voyageId}/documents/${d.id}`, { method: 'DELETE' })
                        if (!res.ok) throw new Error('Failed to delete')
                        setSelectedDocId((cur) => (cur === d.id ? null : cur))
                        await mutate()
                        toast.success('Document deleted')
                      } catch (e) {
                        toast.error('Failed to delete document')
                      }
                    }}
                  >Delete</button>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="font-medium mb-2">Insights</div>
            {!clauses?.length && <div className="text-sm text-neutral-500">No clauses identified yet.</div>}
            <ul className="space-y-1">
              {(clauses||[]).map((c: any) => (
                <li key={c.id}>
                  <button className="text-left text-sm hover:underline" onClick={() => setFocusRangeLocal([c.start_offset, c.end_offset])}>
                    <span className={`badge mr-2 ${c.type === 'laytime' ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' : 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'}`}>{c.type}</span>
                    <span className="text-neutral-700 dark:text-neutral-300">{c.text.slice(0, 80)}{c.text.length > 80 ? '…' : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="md:col-span-2 space-y-3">
          {mode === 'alert' && alertData && (
            <div className="card border-amber-400">
              <div className="font-semibold">⚠️ Laycan Inconsistency</div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">{alertData.message}</div>
            </div>
          )}

          {docsCount === 0 ? (
            <div className="card h-[60vh] flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-lg">No documents uploaded.</div>
                <label className="btn text-base py-2 px-4">
                  <input type="file" className="hidden" onChange={handleUpload} />
                  Upload Document
                </label>
              </div>
            </div>
          ) : doc ? (
            <>
              <div className="card">
                <div className="text-sm text-neutral-500 flex items-center gap-2">
                  <span>{doc.filename}</span>
                  <span>{statusBadge(doc.status)}</span>
                  {doc.status === 'processing' && <span className="spinner" />}
                </div>
                {doc.status !== 'ready' && (
                  <div className="mt-2 text-sm text-amber-600">Processing… highlights and alerts will appear shortly.</div>
                )}
              </div>
              {doc.text ? (
                <DocumentViewer text={doc.text || ''} clauseRanges={renderedRanges} focusRange={focusRange} />
              ) : (
                <div className="card">No text extracted yet.</div>
              )}
            </>
          ) : (
            <div className="card">Select or upload a document to preview.</div>
          )}
        </div>
      </div>
    </main>
  )
}

function NOREditorInline({ voyageId, currentNOR, onSaved }: { voyageId: number, currentNOR?: string, onSaved?: () => void }) {
  const [nor, setNor] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <form className="flex items-center gap-2" onSubmit={async (e) => {
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
          setNor('')
          onSaved?.()
        } else {
          toast.error('Failed to update NOR')
        }
      } finally {
        setSaving(false)
      }
    }}>
      <label className="text-sm text-neutral-600">NOR date</label>
      <input type="date" className="input w-[16ch]" value={nor} placeholder={currentNOR} onChange={(e) => setNor(e.target.value)} />
      <button className="btn" disabled={saving || !nor.trim()} type="submit">Save</button>
    </form>
  )
}
