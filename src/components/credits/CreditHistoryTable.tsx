'use client'

import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type TransactionType =
  | 'purchase'
  | 'deduction'
  | 'subscription_grant'
  | 'refund'

type CreditTransaction = {
  id: number
  type: TransactionType
  amount: number
  balanceAfter: number
  description: string
  createdAt: string
}

type PaginatedResponse = {
  transactions: CreditTransaction[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

const TRANSACTION_LABELS: Record<TransactionType, string> = {
  purchase: 'Achat',
  deduction: 'Déduction',
  subscription_grant: 'Abonnement',
  refund: 'Remboursement',
}

const TRANSACTION_COLORS: Record<
  TransactionType,
  { text: string; bg: string; icon: typeof ArrowUpRight }
> = {
  purchase: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
    icon: ArrowUpRight,
  },
  subscription_grant: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    icon: ArrowUpRight,
  },
  deduction: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    icon: ArrowDownLeft,
  },
  refund: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    icon: ArrowUpRight,
  },
}

export function CreditHistoryTable() {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchHistory(page)
  }, [page])

  const fetchHistory = async (pageNumber: number) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/credits/history?page=${pageNumber}&pageSize=10`,
      )
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Échec du chargement')
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatAmount = (amount: number, type: TransactionType) => {
    const sign = type === 'deduction' ? '-' : '+'
    return `${sign}${Math.abs(amount)} min`
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          Chargement de l'historique...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => fetchHistory(page)}
        >
          Réessayer
        </Button>
      </div>
    )
  }

  if (!data || data.transactions.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/30 p-12 text-center">
        <p className="text-muted-foreground">Aucune transaction trouvée</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Solde après</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.transactions.map((transaction) => {
              const config = TRANSACTION_COLORS[transaction.type]
              const Icon = config.icon

              return (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {formatDate(transaction.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn('rounded-lg p-1.5', config.bg)}>
                        <Icon className={cn('size-4', config.text)} />
                      </div>
                      <span className="text-sm font-medium">
                        {TRANSACTION_LABELS[transaction.type]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn('font-semibold font-mono', config.text)}
                    >
                      {formatAmount(transaction.amount, transaction.type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {transaction.balanceAfter} min
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.pagination.page} sur {data.pagination.totalPages} (
            {data.pagination.total} transaction
            {data.pagination.total > 1 ? 's' : ''})
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.pagination.page === 1 || loading}
            >
              <ChevronLeft className="size-4 mr-1" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((p) => Math.min(data.pagination.totalPages, p + 1))
              }
              disabled={
                data.pagination.page === data.pagination.totalPages || loading
              }
            >
              Suivant
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
