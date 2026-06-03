import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton() {
  return (
    <div className="py-8 px-4 max-w-5xl mx-auto">
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-4 w-20" />
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
            <Skeleton className="h-4 w-44" />
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-4 w-20" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border p-8 space-y-6"
              >
                <div className="space-y-2">
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-14 w-36" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <div className="space-y-4">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border p-8 space-y-6"
            >
              <div className="space-y-1">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-24 rounded-xl" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
