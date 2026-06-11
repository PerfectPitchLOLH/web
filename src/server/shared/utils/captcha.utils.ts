const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyCaptchaToken(
  token: string | undefined | null,
  ip: string | null,
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) return true
  if (!token) return false

  const body = new URLSearchParams({ secret: secretKey, response: token })
  if (ip) body.set('remoteip', ip)

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) return false

  const result = (await response.json()) as { success: boolean }
  return result.success
}
