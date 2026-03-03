import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AuditLogEntry } from '@/server/domains/admin'

import { AuditLogRow } from './AuditLogRow'

type AuditLogsTableProps = {
  logs: AuditLogEntry[]
  formatTimestamp: (date: Date) => string
}

export function AuditLogsTable({ logs, formatTimestamp }: AuditLogsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date & Heure</TableHead>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Ressource</TableHead>
          <TableHead>Détails</TableHead>
          <TableHead>IP</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <AuditLogRow
            key={log.id}
            log={log}
            formatTimestamp={formatTimestamp}
          />
        ))}
      </TableBody>
    </Table>
  )
}
