'use client'

import { Loader2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { UserTargeting } from '@/components/admin/notifications/UserTargeting'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InlineAlert } from '@/components/ui/inline-alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export type NotificationFormData = {
  type: string
  title: string
  description: string
  icon: string
  targeting: {
    sendToAll: boolean
    filters: {
      subscriptionStatus?: string
      subscriptionPlanName?: string
      activityDays?: number
      userIds?: string[]
    }
  }
}

type Props = {
  data: NotificationFormData
  onChange: (data: NotificationFormData) => void
}

const NOTIFICATION_TYPES = [
  { value: 'security', label: 'Sécurité', icon: 'Shield' },
  { value: 'activity', label: 'Activité', icon: 'Activity' },
  { value: 'update', label: 'Mise à jour', icon: 'Sparkles' },
  { value: 'marketing', label: 'Marketing', icon: 'Mail' },
  { value: 'system', label: 'Système', icon: 'Bell' },
  { value: 'custom', label: 'Personnalisé', icon: 'Info' },
]

export function NotificationComposer({ data, onChange }: Props) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFieldChange(field: string, value: any) {
    onChange({ ...data, [field]: value })
  }

  function handleTypeChange(type: string) {
    const selectedType = NOTIFICATION_TYPES.find((t) => t.value === type)
    onChange({
      ...data,
      type,
      icon: selectedType?.icon || 'Bell',
    })
  }

  function isTargetingValid() {
    if (data.targeting.sendToAll) return true
    const filters = data.targeting.filters
    return (
      (!!filters.subscriptionStatus && filters.subscriptionStatus !== 'all') ||
      (!!filters.subscriptionPlanName && filters.subscriptionPlanName !== 'all')
    )
  }

  function isFormValid() {
    return (
      data.title.trim() !== '' &&
      data.description.trim() !== '' &&
      isTargetingValid()
    )
  }

  async function handleSend() {
    setError(null)

    if (!data.title.trim()) {
      setError('Le titre est requis')
      return
    }

    if (!data.description.trim()) {
      setError('La description est requise')
      return
    }

    if (!isTargetingValid()) {
      setError(
        'Veuillez sélectionner au moins un filtre de ciblage ou cocher "Envoyer à tous"',
      )
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/admin/notifications/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Échec de l'envoi")
      }

      toast.success('Notification envoyée', {
        description: `${result.data.count} notification(s) envoyée(s) avec succès`,
      })

      router.push('/admin/notifications')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Composer la Notification</CardTitle>
        <CardDescription>
          Remplissez les détails de votre notification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <InlineAlert message={error} />}

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={data.type} onValueChange={handleTypeChange}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            placeholder="Titre de la notification"
            value={data.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Contenu de la notification"
            value={data.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={4}
          />
        </div>

        <UserTargeting
          data={data.targeting}
          onChange={(targeting) => handleFieldChange('targeting', targeting)}
        />

        <div className="flex gap-2">
          <Button
            onClick={handleSend}
            disabled={sending || !isFormValid()}
            className="flex-1"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
