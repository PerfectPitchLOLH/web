import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton() {
  return (
    <div className="py-12 px-4 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-4 md:grid-cols-3 mt-8">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  )
}
