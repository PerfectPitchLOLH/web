'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAnalytics } from '@/hooks/useAnalytics'
import type { PartitionSummary } from '@/server/domains/partition'

export function usePartitionViewer(id: string) {
  const router = useRouter()
  const { track } = useAnalytics()
  const [partition, setPartition] = useState<PartitionSummary | null>(null)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [svgError, setSvgError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [metaRes, svgRes] = await Promise.all([
          fetch(`/api/partitions/${id}`),
          fetch(`/api/partitions/${id}/svg`),
        ])

        if (!metaRes.ok) {
          router.push('/dashboard/partitions')
          return
        }

        const metaData = await metaRes.json()
        setPartition(metaData.data)
        setRenameValue(metaData.data.title)

        if (svgRes.ok) {
          setSvgContent(await svgRes.text())
        } else {
          setSvgError(true)
        }
      } catch {
        setSvgError(true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, router])

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenaming])

  const handleRenameSubmit = useCallback(async () => {
    if (!partition || !renameValue.trim() || renameValue === partition.title) {
      setIsRenaming(false)
      return
    }
    try {
      const res = await fetch(`/api/partitions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message)
      setPartition((prev) =>
        prev ? { ...prev, title: renameValue.trim() } : prev,
      )
    } catch {
      toast.error('Erreur lors du renommage')
    } finally {
      setIsRenaming(false)
    }
  }, [id, partition, renameValue])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleRenameSubmit()
      if (e.key === 'Escape') {
        setRenameValue(partition?.title ?? '')
        setIsRenaming(false)
      }
    },
    [handleRenameSubmit, partition],
  )

  const handleDelete = useCallback(async () => {
    try {
      await fetch(`/api/partitions/${id}`, { method: 'DELETE' })
      toast.success('Partition supprimée')
      router.push('/dashboard/partitions')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }, [id, router])

  const handleDownloadSvg = useCallback(() => {
    if (!svgContent || !partition) return
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${partition.title}.svg`
    a.click()
    URL.revokeObjectURL(url)
    track({
      name: 'export_downloaded',
      properties: { format: 'svg', partitionId: partition.id },
    })
  }, [svgContent, partition, track])

  return {
    partition,
    svgContent,
    svgError,
    isLoading,
    isRenaming,
    setIsRenaming,
    renameValue,
    setRenameValue,
    deleteOpen,
    setDeleteOpen,
    renameInputRef,
    handleRenameSubmit,
    handleRenameKeyDown,
    handleDelete,
    handleDownloadSvg,
  }
}
