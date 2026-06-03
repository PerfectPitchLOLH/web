import { Calendar } from 'lucide-react'

import { TableCell, TableRow } from '@/components/ui/table'
import type { AuditLogEntry } from '@/server/domains/admin'

import { ActionBadge } from './ActionBadge'

type AuditLogRowProps = {
  log: AuditLogEntry
  formatTimestamp: (date: Date) => string
}

export function AuditLogRow({ log, formatTimestamp }: AuditLogRowProps) {
  return (
    <TableRow>
      <TableCell className="flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" />
        <span className="text-sm">{formatTimestamp(log.timestamp)}</span>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{log.userName}</p>
          <p className="text-xs text-muted-foreground">{log.userId}</p>
        </div>
      </TableCell>
      <TableCell>
        <ActionBadge action={log.action} />
      </TableCell>
      <TableCell className="font-mono text-xs">{log.resource}</TableCell>
      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
        {log.details || '-'}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {log.ipAddress || '-'}
      </TableCell>
    </TableRow>
  )
}
