'use client'

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LibraryFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  instrumentFilter: string
  onInstrumentFilterChange: (value: string) => void
  sortBy: 'date_desc' | 'date_asc' | 'title_asc'
  onSortChange: (value: string) => void
}

export function LibraryFilterBar({
  search,
  onSearchChange,
  instrumentFilter,
  onInstrumentFilterChange,
  sortBy,
  onSortChange,
}: LibraryFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une partition..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={instrumentFilter} onValueChange={onInstrumentFilterChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Tous les instruments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les instruments</SelectItem>
          <SelectItem value="piano">Piano</SelectItem>
          <SelectItem value="guitar">Guitare</SelectItem>
          <SelectItem value="bass">Basse</SelectItem>
          <SelectItem value="vocals">Voix</SelectItem>
          <SelectItem value="drums">Batterie</SelectItem>
          <SelectItem value="other">Autre</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date_desc">Plus récent</SelectItem>
          <SelectItem value="date_asc">Plus ancien</SelectItem>
          <SelectItem value="title_asc">Titre A–Z</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
