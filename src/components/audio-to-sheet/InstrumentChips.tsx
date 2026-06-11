'use client'

import { INSTRUMENT_OPTIONS } from '@/components/audio-to-sheet/audio-to-sheet.constants'
import { cn } from '@/lib/utils'
import type { InstrumentType } from '@/server/domains/transcription/transcription.types'

interface InstrumentChipsProps {
  value: InstrumentType
  onChange: (instrument: InstrumentType) => void
  disabled?: boolean
}

export function InstrumentChips({
  value,
  onChange,
  disabled,
}: InstrumentChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Instrument"
      className="grid grid-cols-3 gap-2"
    >
      {INSTRUMENT_OPTIONS.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <option.icon className="h-5 w-5" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
