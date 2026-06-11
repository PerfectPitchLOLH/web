export type PasswordStrength = {
  score: number
  label: 'Faible' | 'Moyen' | 'Fort'
}

const CRITERIA: RegExp[] = [
  /.{8,}/,
  /[A-Z]/,
  /[a-z]/,
  /\d/,
  /[!@#$%^&*(),.?":{}|<>]/,
]

export function getPasswordStrength(password: string): PasswordStrength {
  const score = CRITERIA.reduce(
    (count, regex) => count + (regex.test(password) ? 1 : 0),
    0,
  )

  const label: PasswordStrength['label'] =
    score <= 2 ? 'Faible' : score <= 4 ? 'Moyen' : 'Fort'

  return { score, label }
}
