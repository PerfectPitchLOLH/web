'use client'

import { Check, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DICEBEAR_STYLE = 'shapes'
const SEEDS = [
  'Felix',
  'Lily',
  'Max',
  'Sophie',
  'Alex',
  'Zoe',
  'Sam',
  'Luna',
  'Leo',
  'Aria',
  'Noah',
  'Emma',
]

function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/svg?seed=${encodeURIComponent(seed)}&size=80`
}

function generateRandomSeeds(): string[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 12 }, () =>
    Array.from(
      { length: 8 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join(''),
  )
}

type Props = {
  currentAvatar: string | null
  onSelect: (url: string) => void
}

export function AvatarPicker({ currentAvatar, onSelect }: Props) {
  const [seeds, setSeeds] = useState<string[]>(SEEDS)
  const [selected, setSelected] = useState<string | null>(currentAvatar)

  const handleSelect = (seed: string) => {
    const url = getAvatarUrl(seed)
    setSelected(url)
    onSelect(url)
  }

  const handleRegenerate = () => {
    setSeeds(generateRandomSeeds())
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2">
        {seeds.map((seed) => {
          const url = getAvatarUrl(seed)
          const isSelected = selected === url
          return (
            <button
              key={seed}
              type="button"
              onClick={() => handleSelect(seed)}
              className={cn(
                'relative rounded-full overflow-hidden ring-2 ring-offset-2 transition-all hover:scale-110',
                isSelected
                  ? 'ring-primary'
                  : 'ring-transparent hover:ring-border',
              )}
            >
              <Image
                src={url}
                alt={`Avatar ${seed}`}
                width={48}
                height={48}
                className="rounded-full"
                unoptimized
              />
              {isSelected && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-full">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
            </button>
          )
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRegenerate}
        className="gap-2"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Régénérer
      </Button>
    </div>
  )
}
