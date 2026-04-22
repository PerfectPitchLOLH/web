'use client'

import { useParams } from 'next/navigation'

import { PartitionViewerContent } from '@/components/partitions/PartitionViewerContent'

export default function PartitionViewerPage() {
  const params = useParams()
  return <PartitionViewerContent id={params.id as string} />
}
