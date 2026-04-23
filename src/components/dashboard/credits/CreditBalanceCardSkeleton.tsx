export function CreditBalanceCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-card/50 p-6 backdrop-blur-sm shadow-lg shadow-black/5 animate-pulse">
      <div className="h-6 w-48 bg-muted rounded mb-4" />
      <div className="h-16 w-full bg-muted rounded mb-4" />
      <div className="h-4 w-32 bg-muted rounded" />
    </div>
  )
}
