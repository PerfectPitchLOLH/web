'use client'

import Link from 'next/link'
import { useId } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

type Props = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function WithdrawalWaiverCheckbox({
  checked,
  onCheckedChange,
  disabled,
}: Props) {
  const id = useId()

  return (
    <div className="flex items-start gap-3 text-left">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <Label
        htmlFor={id}
        className="text-sm font-normal leading-relaxed text-muted-foreground"
      >
        <span>
          Je demande l&apos;exécution immédiate de ma commande et je renonce
          expressément à mon droit de rétractation (article 4 des{' '}
          <Link
            href="/legal/cgv"
            target="_blank"
            className="text-primary hover:underline"
          >
            CGV
          </Link>
          ).
        </span>
      </Label>
    </div>
  )
}
