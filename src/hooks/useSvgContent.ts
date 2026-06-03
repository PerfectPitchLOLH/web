'use client'

import { useEffect, useState } from 'react'

import { makeResponsiveSvg } from '@/lib/svg.utils'
import type {
  JobResults,
  JobStatus,
} from '@/server/domains/transcription/transcription.types'

export function useSvgContent(
  results: JobResults | null,
  jobId: string | null,
  status: JobStatus | null,
) {
  const [svgContent, setSvgContent] = useState<string | null>(null)

  useEffect(() => {
    if (!results || !jobId || status !== 'completed') {
      setSvgContent(null)
      return
    }
    fetch(results.partition_svg_url)
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (text) setSvgContent(makeResponsiveSvg(text))
      })
      .catch(() => {})
  }, [results, jobId, status])

  return svgContent
}
