'use client'

import { useCallback, useRef, useState } from 'react'

export function useAudioDropzone(
  onFileSelect: (file: File, durationSeconds?: number) => void,
) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileWithDuration = useCallback(
    async (file: File) => {
      let duration: number | undefined
      try {
        const objectUrl = URL.createObjectURL(file)
        duration = await new Promise<number | undefined>((resolve) => {
          const audio = new Audio()
          audio.addEventListener('loadedmetadata', () => {
            URL.revokeObjectURL(objectUrl)
            resolve(isFinite(audio.duration) ? audio.duration : undefined)
          })
          audio.addEventListener('error', () => {
            URL.revokeObjectURL(objectUrl)
            resolve(undefined)
          })
          audio.src = objectUrl
        })
      } catch {}
      onFileSelect(file, duration)
    },
    [onFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileWithDuration(file)
    },
    [handleFileWithDuration],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFileWithDuration(f)
    },
    [handleFileWithDuration],
  )

  return {
    isDragOver,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    openFilePicker,
    handleInputChange,
  }
}
