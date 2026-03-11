import { Download, ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SubscriptionInfo } from '@/hooks/useSubscription'
import { cn } from '@/lib/utils'

import { formatAmount, formatDate } from '../utils'

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    paid: {
      label: 'Payée',
      className: 'border-green-500/50 bg-green-500/10 text-green-500',
    },
    failed: {
      label: 'Échouée',
      className: 'border-red-500/50 bg-red-500/10 text-red-500',
    },
    open: {
      label: 'En attente',
      className: 'border-orange-500/50 bg-orange-500/10 text-orange-500',
    },
  }

  const { label, className } = config[status] ?? {
    label: status,
    className: 'border-muted',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', className)}>
      {label}
    </Badge>
  )
}

export function InvoicesSection({
  invoices,
}: {
  invoices: SubscriptionInfo['invoices']
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">Historique des factures</h3>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune facture pour le moment.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Montant
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Statut
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, i) => (
                <tr
                  key={invoice.id}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    i !== invoices.length - 1 && 'border-b border-border/50',
                  )}
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(invoice.paidAt ?? invoice.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatAmount(invoice.amount, invoice.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {invoice.hostedInvoiceUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          asChild
                        >
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      )}
                      {invoice.invoicePdf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          asChild
                        >
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="size-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
