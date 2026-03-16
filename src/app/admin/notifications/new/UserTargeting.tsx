import { Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

type SubscriptionPlan = {
  id: string
  name: string
  description: string | null
}

type Props = {
  data: {
    sendToAll: boolean
    filters: {
      subscriptionStatus?: string
      subscriptionPlanName?: string
      userIds?: string[]
    }
  }
  onChange: (data: Props['data']) => void
}

export function UserTargeting({ data, onChange }: Props) {
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    fetchPlans()
  }, [])

  useEffect(() => {
    if (data.sendToAll || Object.keys(data.filters).length > 0) {
      fetchPreviewCount()
    } else {
      setPreviewCount(null)
    }
  }, [data])

  async function fetchPlans() {
    try {
      const response = await fetch('/api/admin/subscription-plans')
      const result = await response.json()
      if (result.success && result.data) {
        setPlans(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error)
    } finally {
      setLoadingPlans(false)
    }
  }

  async function fetchPreviewCount() {
    setLoadingCount(true)
    try {
      const response = await fetch('/api/admin/notifications/preview-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: data.sendToAll ? {} : data.filters }),
      })

      const result = await response.json()
      if (result.success && result.data) {
        setPreviewCount(result.data.count)
      }
    } catch {
      setPreviewCount(null)
    } finally {
      setLoadingCount(false)
    }
  }

  function handleSendToAllChange(checked: boolean) {
    onChange({
      sendToAll: checked,
      filters: checked ? {} : data.filters,
    })
  }

  function handleFilterChange(field: string, value: any) {
    onChange({
      ...data,
      filters: {
        ...data.filters,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Ciblage des Utilisateurs
        </Label>
        {previewCount !== null && (
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm">
            <Users className="size-4 text-primary" />
            <span className="font-medium text-primary">
              {loadingCount ? '...' : previewCount} utilisateur(s)
            </span>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center space-x-2">
        <Checkbox
          id="sendToAll"
          checked={data.sendToAll}
          onCheckedChange={handleSendToAllChange}
        />
        <Label
          htmlFor="sendToAll"
          className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Envoyer à tous les utilisateurs
        </Label>
      </div>

      {!data.sendToAll && (
        <>
          <div className="space-y-2">
            <Label htmlFor="subscriptionStatus">Statut d'abonnement</Label>
            <Select
              value={data.filters.subscriptionStatus || 'all'}
              onValueChange={(value) =>
                handleFilterChange(
                  'subscriptionStatus',
                  value === 'all' ? undefined : value,
                )
              }
            >
              <SelectTrigger id="subscriptionStatus">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="canceled">Annulés</SelectItem>
                <SelectItem value="trial">En période d'essai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscriptionPlanName">Type d'abonnement</Label>
            <Select
              value={data.filters.subscriptionPlanName || 'all'}
              onValueChange={(value) =>
                handleFilterChange(
                  'subscriptionPlanName',
                  value === 'all' ? undefined : value,
                )
              }
              disabled={loadingPlans}
            >
              <SelectTrigger id="subscriptionPlanName">
                <SelectValue
                  placeholder={loadingPlans ? 'Chargement...' : 'Tous'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.name}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  )
}
