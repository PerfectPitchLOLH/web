import { Skeleton } from './skeleton'
import { cn } from '@/lib/utils'

export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'size-8',
    md: 'size-10',
    lg: 'size-12',
  }

  return <Skeleton variant="circular" className={sizeClasses[size]} />
}

export function TextSkeleton({
  lines = 1,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn('h-4', i === lines - 1 && lines > 1 && 'w-4/5')}
        />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-6">
      <Skeleton className="h-6 w-40" />
      <TextSkeleton lines={2} />
      <Skeleton className="mt-4 h-10 w-32" />
    </div>
  )
}

export function UserMenuTriggerSkeleton() {
  return <AvatarSkeleton size="md" />
}

export function UserMenuDropdownSkeleton() {
  return (
    <div className="w-72 space-y-3 p-2">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-40" />
      </div>

      <Skeleton className="h-px w-full" />

      <div className="space-y-2 rounded-lg bg-muted p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-full rounded-md" />
      </div>

      <Skeleton className="h-px w-full" />

      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-2">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  )
}
