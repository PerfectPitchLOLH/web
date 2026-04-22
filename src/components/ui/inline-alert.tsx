import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

type InlineAlertProps = {
  message: ReactNode
  variant?: 'destructive' | 'default'
  icon?: ReactNode
  compact?: boolean
  action?: { label: string; href: string }
  className?: string
}

export function InlineAlert({
  message,
  variant = 'destructive',
  icon = <AlertCircle className="h-4 w-4" />,
  compact = false,
  action,
  className,
}: InlineAlertProps) {
  return (
    <Alert variant={variant} className={cn(compact && 'py-2', className)}>
      {icon}
      <AlertDescription className={cn(compact && 'text-xs')}>
        {message}
        {action && (
          <>
            {' '}
            <Link href={action.href} className="underline underline-offset-2 font-medium">
              {action.label}
            </Link>
          </>
        )}
      </AlertDescription>
    </Alert>
  )
}
