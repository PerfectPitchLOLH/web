import { auth } from '@/server/lib/auth'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export async function DashboardWelcome() {
  const session = await auth()
  const name = session?.user?.name
  const greeting = getGreeting()

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-semibold">
        {name ? `${greeting}, ${name} !` : `${greeting} !`}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Votre espace de travail pour la séparation de stems et la production
        musicale
      </p>
    </div>
  )
}
