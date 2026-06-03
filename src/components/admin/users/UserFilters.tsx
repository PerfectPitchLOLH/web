import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type UserFiltersProps = {
  search: string
  roleFilter: string
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: string) => void
  onSearch: (e: React.FormEvent) => void
}

export function UserFilters({
  search,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
  onSearch,
}: UserFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtres</CardTitle>
        <CardDescription>
          Rechercher et filtrer les utilisateurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email ou nom..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={roleFilter} onValueChange={onRoleFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit">Rechercher</Button>
        </form>
      </CardContent>
    </Card>
  )
}
