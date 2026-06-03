import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type RoleDistributionCardProps = {
  usersByRole: Record<string, number>
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-red-500'
    case 'user':
      return 'bg-blue-500'
    default:
      return 'bg-gray-500'
  }
}

export function RoleDistributionCard({
  usersByRole,
}: RoleDistributionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition par Rôle</CardTitle>
        <CardDescription>
          Distribution des utilisateurs par rôle
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(usersByRole).map(([role, count]) => (
            <div key={role} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`size-3 rounded-full ${getRoleColor(role)}`} />
                <span className="capitalize">{role}</span>
              </div>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
