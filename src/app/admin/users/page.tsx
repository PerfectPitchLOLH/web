'use client'

import type { User as PrismaUser } from '@prisma/client'
import {
  AlertCircle,
  Crown,
  MoreVertical,
  Search,
  Shield,
  Trash2,
  User as UserIcon,
  UserCheck as UserCheckIcon,
  UserX,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { UserManagementResult } from '@/server/domains/admin'

type User = PrismaUser & {
  isRootAdmin: boolean
}

type CurrentUser = {
  id: string
  email: string
  name: string
  role: string
  isRootAdmin: boolean
}

type ActionDialog = {
  type: 'suspend' | 'delete' | null
  user: User | null
}

export default function UsersManagement() {
  const [users, setUsers] = useState<UserManagementResult | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [actionDialog, setActionDialog] = useState<ActionDialog>({
    type: null,
    user: null,
  })

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/admin/me')
      if (!res.ok) {
        throw new Error('Failed to fetch current user')
      }
      const data = await res.json()
      setCurrentUser(data.data)
    } catch (err) {
      console.error('Error fetching current user:', err)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })

      if (search) params.set('search', search)
      if (roleFilter !== 'all') params.set('role', roleFilter)

      const res = await fetch(`/api/admin/users?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await res.json()
      setUsers(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to update role')
      }

      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleSuspendUser = async () => {
    if (!actionDialog.user) return

    try {
      const res = await fetch('/api/admin/users/suspend', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: actionDialog.user.id }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to suspend user')
      }

      setActionDialog({ type: null, user: null })
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend user')
    }
  }

  const handleDeleteUser = async () => {
    if (!actionDialog.user) return

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: actionDialog.user.id }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to delete user')
      }

      setActionDialog({ type: null, user: null })
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const canPerformAction = (targetUser: User): boolean => {
    if (!currentUser) return false
    if (targetUser.id === currentUser.id) return false
    if (targetUser.isRootAdmin) return false
    if (targetUser.role === 'admin' && !currentUser.isRootAdmin) return false
    return true
  }

  const canChangeRole = (targetUser: User): boolean => {
    if (!currentUser) return false
    if (targetUser.id === currentUser.id) return false
    if (targetUser.isRootAdmin && !currentUser.isRootAdmin) return false
    if (targetUser.role === 'admin' && !currentUser.isRootAdmin) return false
    return true
  }

  const getDisabledReason = (targetUser: User): string | null => {
    if (!currentUser) return null
    if (targetUser.id === currentUser.id) {
      return 'Vous ne pouvez pas modifier votre propre compte'
    }
    if (targetUser.isRootAdmin && !currentUser.isRootAdmin) {
      return 'Seul le Root Admin peut modifier le Root Admin'
    }
    if (targetUser.role === 'admin' && !currentUser.isRootAdmin) {
      return 'Seul le Root Admin peut modifier les administrateurs'
    }
    return null
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'user':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500">
            Actif
          </Badge>
        )
      case 'suspended':
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500">
            Suspendu
          </Badge>
        )
      case 'deleted':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500">
            Supprimé
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Gestion des Utilisateurs
        </h1>
        <p className="text-muted-foreground">
          Gérer les utilisateurs et leurs rôles
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>
            Rechercher et filtrer les utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par email ou nom..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
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

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>
            {users?.total || 0} utilisateur(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Vérifié</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.users.map((user: User) => {
                    const canAct = canPerformAction(user)
                    const canRole = canChangeRole(user)
                    const disabledReason = getDisabledReason(user)

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role === 'admin' && (
                                <Shield className="mr-1 size-3" />
                              )}
                              {user.role === 'user' && (
                                <UserIcon className="mr-1 size-3" />
                              )}
                              {user.role}
                            </Badge>
                            {user.isRootAdmin && (
                              <Badge
                                variant="outline"
                                className="border-yellow-500 bg-yellow-500/10 text-yellow-500"
                              >
                                <Crown className="mr-1 size-3" />
                                Root Admin
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          {user.emailVerified ? (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10"
                            >
                              Oui
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-yellow-500/10"
                            >
                              Non
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          {canAct ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Shield className="mr-2 size-4" />
                                    Changer le rôle
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleRoleChange(user.id, 'admin')
                                      }
                                      disabled={user.role === 'admin'}
                                    >
                                      <Shield className="mr-2 size-4" />
                                      Admin
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleRoleChange(user.id, 'user')
                                      }
                                      disabled={user.role === 'user'}
                                    >
                                      <UserIcon className="mr-2 size-4" />
                                      User
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() =>
                                    setActionDialog({
                                      type: 'suspend',
                                      user,
                                    })
                                  }
                                >
                                  {user.status === 'suspended' ? (
                                    <>
                                      <UserCheckIcon className="mr-2 size-4" />
                                      Réactiver
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="mr-2 size-4" />
                                      Suspendre
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    setActionDialog({
                                      type: 'delete',
                                      user,
                                    })
                                  }
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled
                                    >
                                      <MoreVertical className="size-4" />
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{disabledReason}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {users && users.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {users.page} sur {users.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={page === users.totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={actionDialog.type === 'suspend'}
        onOpenChange={() => setActionDialog({ type: null, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.user?.status === 'suspended'
                ? 'Réactiver le compte'
                : 'Suspendre le compte'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.user?.status === 'suspended'
                ? `Êtes-vous sûr de vouloir réactiver le compte de ${actionDialog.user?.email} ?`
                : `Êtes-vous sûr de vouloir suspendre le compte de ${actionDialog.user?.email} ? L'utilisateur ne pourra plus se connecter.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspendUser}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={actionDialog.type === 'delete'}
        onOpenChange={() => setActionDialog({ type: null, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le compte de{' '}
              {actionDialog.user?.email} ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
