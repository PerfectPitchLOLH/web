import { Button } from '@/components/ui/button'
import { UserMenuTriggerSkeleton } from '@/components/ui/skeleton-variants'

export function UserMenuSkeleton() {
  return (
    <Button
      variant="ghost"
      className="relative size-10 rounded-full p-0"
      disabled
    >
      <UserMenuTriggerSkeleton />
    </Button>
  )
}
