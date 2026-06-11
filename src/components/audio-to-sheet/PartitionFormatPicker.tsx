'use client'

import {
  getFormatAvailability,
  PARTITION_FORMAT_OPTIONS,
} from '@/components/audio-to-sheet/audio-to-sheet.constants'
import { cn } from '@/lib/utils'
import type {
  InstrumentMode,
  InstrumentType,
  PartitionType,
} from '@/server/domains/transcription/transcription.types'

interface PartitionFormatPickerProps {
  value: PartitionType
  instrument: InstrumentType
  mode: InstrumentMode
  onChange: (format: PartitionType) => void
  disabled?: boolean
}

export function PartitionFormatPicker({
  value,
  instrument,
  mode,
  onChange,
  disabled,
}: PartitionFormatPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Format de partition"
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {PARTITION_FORMAT_OPTIONS.map((option) => {
        const selected = option.value === value
        const { available, reason } = getFormatAvailability(
          option.value,
          instrument,
          mode,
        )
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled || !available}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
              (disabled || !available) && 'opacity-50 cursor-not-allowed',
            )}
          >
            <p
              className={cn(
                'text-sm font-medium',
                selected ? 'text-primary' : 'text-foreground',
              )}
            >
              {option.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {available ? option.description : reason}
            </p>
          </button>
        )
      })}
    </div>
  )
}
