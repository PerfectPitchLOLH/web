'use client'

import { BookmarkPlus, Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SavePartitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTitle: string
  jobId: string
  originalFileName?: string
  onSaved: (partitionId: string) => void
}

export function SavePartitionDialog({
  open,
  onOpenChange,
  defaultTitle,
  jobId,
  originalFileName,
  onSaved,
}: SavePartitionDialogProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [titleError, setTitleError] = useState('')

  useEffect(() => {
    if (!open) {
      setTitle(defaultTitle)
    }
  }, [defaultTitle, open])

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (!trimmed || tags.length >= 10 || trimmed.length > 30) return
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setTitleError('Le nom est requis')
      return
    }
    setTitleError('')
    setIsSaving(true)

    try {
      const response = await fetch('/api/partitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          title: title.trim(),
          tags,
          notes: notes.trim() || undefined,
          originalFileName,
        }),
      })

      const data = await response.json()

      if (
        response.status === 409 &&
        data.error?.code === 'PARTITION_ALREADY_SAVED'
      ) {
        const existingId = data.error?.details?.id
        if (existingId) {
          onSaved(existingId)
          onOpenChange(false)
          return
        }
      }

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur lors de la sauvegarde')
      }

      onSaved(data.data.id)
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erreur lors de la sauvegarde',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sauvegarder la partition</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="partition-title">Nom de la partition *</Label>
            <Input
              id="partition-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
            {titleError && (
              <p className="text-destructive text-xs">{titleError}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="partition-tags">Tags (optionnel)</Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              id="partition-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Ajouter un tag..."
              disabled={tags.length >= 10}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="partition-notes">Notes (optionnel)</Label>
            <Textarea
              id="partition-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez une note sur cette partition..."
              maxLength={500}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde en cours...
                </>
              ) : (
                <>
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Sauvegarder
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
