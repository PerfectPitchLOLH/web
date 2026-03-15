import { Skeleton } from '@/components/ui/skeleton'

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-5 border-b last:border-0">
      <div className="flex-1 min-w-0 pr-6 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-6 w-11 rounded-full" />
    </div>
  )
}

export function NotificationSettingsSkeleton() {
  return (
    <div>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
