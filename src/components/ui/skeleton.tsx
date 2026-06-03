import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const skeletonVariants = cva(
  'motion-safe:animate-pulse motion-reduce:animate-none bg-accent',
  {
    variants: {
      variant: {
        default: 'rounded-md',
        shimmer:
          'rounded-md relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        text: 'rounded-sm',
        circular: 'rounded-full',
        rectangle: 'rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface SkeletonProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Skeleton, skeletonVariants }
