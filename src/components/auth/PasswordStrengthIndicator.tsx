'use client'

import { getPasswordStrength } from '@/lib/password-strength'
import { cn } from '@/lib/utils'

const STRENGTH_COLORS: Record<string, string> = {
  Faible: 'bg-destructive',
  Moyen: 'bg-yellow-500',
  Fort: 'bg-green-500',
}

export function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null

  const { score, label } = getPasswordStrength(password)

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full bg-muted transition-colors',
              index < score && STRENGTH_COLORS[label],
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Force du mot de passe : <span className="font-medium">{label}</span>
      </p>
    </div>
  )
}
