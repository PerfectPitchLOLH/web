import type { LucideIcon } from 'lucide-react'
import {
  AudioLines,
  Drum,
  FileText,
  Guitar,
  Layers,
  Mic,
  MicVocal,
  Piano,
  Sparkles,
  Wand2,
} from 'lucide-react'

import type {
  InstrumentMode,
  InstrumentType,
  PartitionType,
  ProcessingStep,
  TargetStem,
} from '@/server/domains/transcription/transcription.types'

export const STEPS: ProcessingStep[] = [
  'preprocessing',
  'separation',
  'transcription',
  'musicxml',
  'score',
  'svg',
]

export const INSTRUMENT_TO_STEM: Record<InstrumentType, TargetStem> = {
  bass: 'bass',
  vocals: 'vocals',
  drums: 'drums',
  guitar: 'other',
  piano: 'other',
  other: 'other',
  multiple: 'other',
}

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  piano: 'Piano',
  guitar: 'Guitare',
  bass: 'Basse',
  vocals: 'Voix',
  drums: 'Batterie',
  other: 'Autre',
  multiple: 'Multiple',
}

export const PARTITION_TYPE_LABELS: Record<PartitionType, string> = {
  classique: 'Classique',
  piano: 'Piano',
  tab_basse: 'Tab. Basse',
  tab_guitare: 'Tab. Guitare',
}

export const STEP_ICONS: Partial<Record<ProcessingStep, LucideIcon>> = {
  preprocessing: Wand2,
  separation: Layers,
  transcription: Mic,
  score: FileText,
}

export const INSTRUMENT_OPTIONS: {
  value: InstrumentType
  label: string
  icon: LucideIcon
}[] = [
  { value: 'piano', label: 'Piano', icon: Piano },
  { value: 'guitar', label: 'Guitare', icon: Guitar },
  { value: 'bass', label: 'Basse', icon: AudioLines },
  { value: 'vocals', label: 'Voix', icon: MicVocal },
  { value: 'drums', label: 'Batterie', icon: Drum },
  { value: 'other', label: 'Autre', icon: Sparkles },
]

export const PARTITION_FORMAT_OPTIONS: {
  value: PartitionType
  label: string
  description: string
}[] = [
  { value: 'classique', label: 'Classique', description: 'Portée standard' },
  { value: 'piano', label: 'Piano', description: 'Double portée (sol + fa)' },
  {
    value: 'tab_guitare',
    label: 'Tablature guitare',
    description: '6 cordes, frettes',
  },
  {
    value: 'tab_basse',
    label: 'Tablature basse',
    description: '4 cordes, frettes',
  },
]

export function getFormatAvailability(
  format: PartitionType,
  instrument: InstrumentType,
  mode: InstrumentMode,
): { available: boolean; reason?: string } {
  if (format === 'piano' && instrument !== 'piano' && instrument !== 'other') {
    return { available: false, reason: 'Réservé au piano' }
  }
  if (format === 'tab_guitare' || format === 'tab_basse') {
    if (mode === 'multiple') {
      return {
        available: false,
        reason: 'Incompatible avec la séparation de pistes',
      }
    }
    if (
      format === 'tab_guitare' &&
      instrument !== 'guitar' &&
      instrument !== 'other'
    ) {
      return { available: false, reason: 'Réservée à la guitare' }
    }
    if (
      format === 'tab_basse' &&
      instrument !== 'bass' &&
      instrument !== 'other'
    ) {
      return { available: false, reason: 'Réservée à la basse' }
    }
  }
  return { available: true }
}

export const POLYPHONIC_DEFAULTS: Record<InstrumentType, boolean> = {
  piano: true,
  guitar: true,
  bass: false,
  vocals: false,
  drums: false,
  other: true,
  multiple: true,
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
