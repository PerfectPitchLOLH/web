import { Skeleton } from '@/components/ui/skeleton'

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-5 border-b last:border-0">
      <div className="flex-1 min-w-0 pr-6 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-8 w-24 rounded-md" />
    </div>
  )
}

export function ProfileSettingsSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
