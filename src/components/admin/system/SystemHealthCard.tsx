import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { SystemHealthItem } from './SystemHealthItem'

export function SystemHealthCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Santé du Système</CardTitle>
        <CardDescription>
          État des différents composants de la plateforme
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <SystemHealthItem
            name="API Server"
            description="Opérationnel"
            status="healthy"
          />
          <SystemHealthItem
            name="Base de Données"
            description="PostgreSQL connecté"
            status="healthy"
          />
          <SystemHealthItem
            name="Authentication"
            description="NextAuth.js actif"
            status="healthy"
          />
          <SystemHealthItem
            name="Cache"
            description="Non configuré"
            status="warning"
          />
        </div>
      </CardContent>
    </Card>
  )
}
