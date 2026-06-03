import { Check } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function CellValue({
  value,
  highlight,
}: {
  value: string | boolean
  highlight?: boolean
}) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check
        className={cn(
          'size-5 mx-auto',
          highlight ? 'text-primary' : 'text-foreground',
        )}
      />
    ) : (
      <div className="size-5 mx-auto flex items-center justify-center">
        <div className="size-2 rounded-full bg-muted-foreground/30" />
      </div>
    )
  }
  return (
    <span className={cn(highlight && 'font-semibold text-primary')}>
      {value}
    </span>
  )
}

export function ComparisonTable() {
  return (
    <div className="mt-20 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Comparaison détaillée</h2>
        <p className="text-muted-foreground">
          Trouvez l&apos;offre qui correspond le mieux à vos besoins
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 pt-8 font-semibold">
                Fonctionnalité
              </th>
              <th className="text-center p-4 pt-8 font-semibold">Junior</th>
              <th className="text-center p-4 pt-8 font-semibold bg-primary/5 relative">
                <Badge
                  variant="outline"
                  className="absolute top-2 left-1/2 -translate-x-1/2 border-primary text-primary bg-background"
                >
                  Populaire
                </Badge>
                Basic
              </th>
              <th className="text-center p-4 pt-8 font-semibold">Pro</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                feature: 'Minutes de transcription',
                junior: '10 min/mois',
                basic: '20 min/mois',
                pro: '50 min/mois',
              },
              {
                feature: 'Touches qui tombent du ciel',
                junior: true,
                basic: true,
                pro: true,
              },
              {
                feature: 'Historique des partitions',
                junior: '30 jours',
                basic: '90 jours',
                pro: 'Illimité',
              },
              {
                feature: 'Éditeur de partition',
                junior: false,
                basic: false,
                pro: true,
              },
              {
                feature: 'Support polyphonie',
                junior: false,
                basic: false,
                pro: true,
              },
            ].map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="p-4 font-medium">{row.feature}</td>
                <td className="text-center p-4">
                  <CellValue value={row.junior} />
                </td>
                <td className="text-center p-4 bg-primary/5">
                  <CellValue value={row.basic} highlight />
                </td>
                <td className="text-center p-4">
                  <CellValue value={row.pro} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
