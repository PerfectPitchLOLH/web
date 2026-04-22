'use client'

import { useParams } from 'next/navigation'

import { JobPageContent } from '@/components/audio-to-sheet/JobPageContent'

export default function JobPage() {
  const params = useParams()
  return <JobPageContent jobId={params.jobId as string} />
}
