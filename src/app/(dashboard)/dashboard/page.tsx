export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Bienvenue sur Notavex</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre espace de travail pour la séparation de stems et la production
            musicale
          </p>
        </div>
      </div>
    </div>
  )
}
