export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string
  lastUpdated: string
  children: React.ReactNode
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="border-b border-border mb-8 pb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Dernière mise à jour : {lastUpdated}
        </p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
