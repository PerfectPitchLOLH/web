'use client'

import {
  AuditLogsHeader,
  AuditLogsTable,
  AuditLogsTableSkeleton,
} from '@/components/admin/audit-logs'
import { Pagination } from '@/components/admin/shared/Pagination'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InlineAlert } from '@/components/ui/inline-alert'
import { useAuditLogs } from '@/hooks/admin'
import { formatTimestamp } from '@/lib/admin/auditLogUtils'

export default function AuditLogsPage() {
  const { logs, loading, error, page, setPage } = useAuditLogs()

  return (
    <div className="space-y-8">
      <AuditLogsHeader />

      {error && <InlineAlert message={error} />}

      <Card>
        <CardHeader>
          <CardTitle>Actions Administratives</CardTitle>
          <CardDescription>
            {logs?.total || 0} action(s) enregistrée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AuditLogsTableSkeleton />
          ) : (
            <>
              <AuditLogsTable
                logs={logs?.logs || []}
                formatTimestamp={formatTimestamp}
              />

              {logs && logs.totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={logs.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
