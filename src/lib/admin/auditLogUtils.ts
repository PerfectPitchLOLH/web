export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(date))
}
