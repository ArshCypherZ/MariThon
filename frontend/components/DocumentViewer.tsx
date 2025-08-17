import React, { useEffect, useMemo, useRef } from 'react'

type Range = [number, number]

type Props = {
  text: string
  clauseRanges: { range: [number, number], type: 'laytime' | 'demurrage' }[]
  focusRange?: [number, number]
}

export default function DocumentViewer({ text, clauseRanges, focusRange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const parts = useMemo(() => {
    // sort ranges and trim overlaps so we never render nested/overlapping marks
    const ranges = [...clauseRanges]
      .map(r => ({ ...r, range: [Math.max(0, r.range[0]), Math.min(text.length, r.range[1])] as [number, number] }))
      .filter(r => r.range[1] > r.range[0])
      .sort((a,b) => a.range[0]-b.range[0])

    const out: { t: string, mark?: { start: number, end: number, type: 'laytime' | 'demurrage' } }[] = []
    let cursor = 0
    for (const { range: [rawS, rawE], type } of ranges) {
      const s = Math.max(cursor, rawS)
      const e = Math.max(s, rawE)
      if (s > cursor) out.push({ t: text.slice(cursor, s) })
      if (e > s) out.push({ t: text.slice(s, e), mark: { start: s, end: e, type } })
      cursor = Math.max(cursor, e)
    }
    if (cursor < text.length) out.push({ t: text.slice(cursor) })
    return out
  }, [text, clauseRanges])

  useEffect(() => {
    if (!focusRange || !containerRef.current) return
    const [s] = focusRange
    const mark = containerRef.current.querySelector(`mark[data-start="${s}"]`)
    if (mark) (mark as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusRange])

  const color = (type: 'laytime' | 'demurrage') => type === 'laytime' ? 'bg-emerald-200 dark:bg-emerald-700' : 'bg-amber-200 dark:bg-amber-700'

  return (
    <div ref={containerRef} className="card whitespace-pre-wrap leading-relaxed max-h-[70vh] overflow-auto">
      {parts.map((p, i) => p.mark ? (
        <mark key={i} data-start={p.mark.start} className={`${color(p.mark.type)} rounded px-0.5`}>
          {p.t}
        </mark>
      ) : p.t)}
    </div>
  )
}
