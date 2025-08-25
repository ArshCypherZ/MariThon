"use client"
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import DocumentViewer from '@/components/DocumentViewer'
import { useSearchParams, useParams } from 'next/navigation'
import { toast } from 'sonner'
import VoyagePageComponent from '@/components/VoyagePage'
import { Card } from '@/components/ui/card'

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

  const handleUpload = async (files: FileList | null) => {
    if (!files) return
    
    setUploading(true)
    try {
      const wsId = 1
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`${API_BASE}/workspaces/${wsId}/voyages/${voyageId}/documents`, { method: 'POST', body: form })
        if (!res.ok) throw new Error(`Upload failed for ${file.name}`)
        toast.success(`Upload started for ${file.name}. Processing…`)
      }
      mutate()
    } catch (e: any) {
      toast.error(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const clauseRanges = useMemo(() => (clauses||[]).map((c: any) => ({ range: [c.start_offset, c.end_offset] as [number, number], type: c.type })), [clauses])
  const focusRange = useMemo(() => {
    if (!alertData?.evidence_offsets) return undefined
    try {
      const arr = JSON.parse(alertData.evidence_offsets)
      if (Array.isArray(arr) && arr.length && Array.isArray(arr[0]) && arr[0].length === 2) {
        return [arr[0][0], arr[0][1]] as [number, number]
      }
    } catch {}
    return undefined
  }, [alertData])

  const docsCount = voyage?.documents?.length || 0

  const handleSelectDocument = (docId: number) => {
    setSelectedDocId(docId);
    setManualSelection(true);
  }

  if (!voyage) {
    return <div>Loading...</div>
  }

  return (
    <VoyagePageComponent
      voyage={voyage}
      onViewDocument={handleSelectDocument}
      onFileUpload={handleUpload}
      selectedDocId={selectedDocId}
    >
        <div className="space-y-4">
          {mode === 'alert' && alertData && (
            <Card className="p-4 border-amber-400">
              <div className="font-semibold">⚠️ Laycan Inconsistency</div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">{alertData.message}</div>
            </Card>
          )}

          {docsCount === 0 ? (
            <Card className="h-[60vh] flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-lg">No documents uploaded.</div>
                <p>Upload a document to get started.</p>
              </div>
            </Card>
          ) : doc ? (
            <>
              <Card className="p-4">
                <div className="text-sm text-neutral-500">{doc.filename}</div>
                {doc.status !== 'ready' && (
                  <div className="mt-2 text-sm text-amber-600">Processing… highlights and alerts will appear shortly.</div>
                )}
              </Card>
              {doc.text ? (
                <DocumentViewer 
                  text={doc.text || ''} 
                  clauses={clauseRanges} 
                  alert={alertData}
                  documentName={doc.filename}
                />
              ) : (
                <Card className="p-4">No text extracted yet.</Card>
              )}
            </>
          ) : (
            <Card className="p-4">Select or upload a document to preview.</Card>
          )}
        </div>
    </VoyagePageComponent>
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
