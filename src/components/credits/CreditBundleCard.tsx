'use client'

import { Check } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CreditBundle } from '@/server/domains/credit'

interface CreditBundleCardProps {
  bundle: CreditBundle
  onPurchase?: (bundleId: string) => void
  index?: number
}

export function CreditBundleCard({
  bundle,
  onPurchase,
  index = 0,
}: CreditBundleCardProps) {
  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border border-border/50 bg-card p-8',
        'shadow-md shadow-black/5',
        'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        'hover:-translate-y-1',
        'transition-all duration-300',
      )}
      style={{
        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
      }}
    >
      {bundle.bestValue && (
        <div className="absolute -top-3 right-6">
          <Badge className="bg-primary text-primary-foreground px-3 py-1 shadow-md">
            Best Value
          </Badge>
        </div>
      )}

      <div className="flex-1">
        <div className="mb-6">
          <h3 className="text-3xl font-bold mb-1">{bundle.minutes} minutes</h3>
          <p className="text-sm text-muted-foreground">{bundle.name}</p>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">
              €{bundle.price.toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            €{bundle.pricePerMinute.toFixed(2)} par minute
          </p>
        </div>

        <div className="h-px bg-border/50 mb-6" />

        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-3 text-sm">
            <div className="rounded-lg p-1.5 bg-primary/10 text-primary mt-0.5">
              <Check className="size-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Sans expiration</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Les minutes achetées ne périment jamais
              </p>
            </div>
          </div>

          {bundle.discountPercent && (
            <div className="flex items-start gap-3 text-sm">
              <div className="rounded-lg p-1.5 bg-green-500/10 text-green-600 dark:text-green-400 mt-0.5">
                <Check className="size-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-600 dark:text-green-400">
                  {bundle.discountPercent}% d'économie
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Par rapport au prix unitaire
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Button
        size="lg"
        variant={bundle.bestValue ? 'default' : 'outline'}
        className="w-full group-hover:scale-[1.02] transition-transform"
        onClick={() => onPurchase?.(bundle.id)}
      >
        Acheter {bundle.minutes} minutes
      </Button>

      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-2xl',
          'bg-gradient-to-br from-primary/5 via-transparent to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'blur-xl',
        )}
      />
    </div>
  )
}
