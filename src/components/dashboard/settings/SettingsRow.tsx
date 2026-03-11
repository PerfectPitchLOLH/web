import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Props = {
  label: string
  value?: string
  description?: string
  action?: ReactNode
  danger?: boolean
}

export function SettingsRow({
  label,
  value,
  description,
  action,
  danger,
}: Props) {
  return (
    <div className="flex items-center justify-between py-5 border-b last:border-0">
      <div className="flex-1 min-w-0 pr-6">
        <p className={cn('text-sm font-medium', danger && 'text-destructive')}>
          {label}
        </p>
        {value && <p className="text-sm text-foreground mt-0.5">{value}</p>}
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
