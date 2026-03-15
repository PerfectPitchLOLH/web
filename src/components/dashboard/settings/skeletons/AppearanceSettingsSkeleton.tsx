import { Skeleton } from '@/components/ui/skeleton'

export function AppearanceSettingsSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between py-5 border-b last:border-0">
        <div className="flex-1 min-w-0 pr-6 space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-16 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
