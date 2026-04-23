import type { LucideIcon } from 'lucide-react'
import { FileText, Layers, Mic, Wand2 } from 'lucide-react'

import type {
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
