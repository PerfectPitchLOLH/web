import { useEffect, useState } from 'react'

import type { UserManagementResult } from '@/server/domains/admin'

export function useUserManagement() {
  const [users, setUsers] = useState<UserManagementResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

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
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  return {
    users,
    loading,
    error,
    search,
    roleFilter,
    page,
    setSearch,
    setRoleFilter,
    setPage,
    refetchUsers: fetchUsers,
    handleSearch,
  }
}
