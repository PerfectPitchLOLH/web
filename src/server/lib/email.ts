import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Notavex <noreply@notavex.com>'
const APP_URL = process.env.API_URL ?? 'https://notavex.com'

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; padding: 20px; margin: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="margin-bottom: 32px;">
        <span style="font-size: 20px; font-weight: 700; color: #111827;">Notavex</span>
      </div>
      ${content}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Notavex — Transformez votre audio en partitions musicales.<br/>
        <a href="${APP_URL}" style="color: #6366f1; text-decoration: none;">${APP_URL}</a>
      </p>
    </div>
  </body>
</html>`
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 8px 0;">${label}</a>`
}

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error)
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const url = `${APP_URL}/auth/verify?token=${token}`
  await send(
    email,
    'Vérifiez votre adresse email — Notavex',
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Vérifiez votre email</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Merci de vous être inscrit sur Notavex. Cliquez sur le bouton ci-dessous pour vérifier votre adresse email.
      </p>
      ${ctaButton(url, 'Vérifier mon email')}
      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        Si vous n'avez pas créé de compte, ignorez cet email. Ce lien expire dans 24 heures.
      </p>
    `),
  )
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const url = `${APP_URL}/auth/reset-password?token=${token}`
  await send(
    email,
    'Réinitialisation de votre mot de passe — Notavex',
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Réinitialisez votre mot de passe</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez ci-dessous pour en créer un nouveau.
      </p>
      ${ctaButton(url, 'Réinitialiser mon mot de passe')}
      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        Si vous n'avez pas fait cette demande, ignorez cet email. Ce lien expire dans 1 heure.
      </p>
    `),
  )
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
): Promise<void> {
  await send(
    email,
    'Bienvenue sur Notavex 🎵',
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Bienvenue, ${name} !</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Votre compte Notavex est créé. Vous pouvez maintenant transformer vos enregistrements audio en partitions musicales grâce à notre IA.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Choisissez un abonnement pour commencer à transcrire vos morceaux.
      </p>
      ${ctaButton(`${APP_URL}/dashboard`, 'Accéder à mon espace')}
    `),
  )
}

export async function sendTrialEndingEmail(
  email: string,
  name: string,
  trialEndDate: Date,
): Promise<void> {
  const formattedDate = trialEndDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  await send(
    email,
    "Votre période d'essai se termine bientôt — Notavex",
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Votre essai se termine le ${formattedDate}</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bonjour ${name}, votre période d'essai gratuite se termine dans 3 jours.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Pour continuer à utiliser Notavex sans interruption, assurez-vous que votre moyen de paiement est bien configuré.
      </p>
      ${ctaButton(`${APP_URL}/dashboard/subscription`, 'Gérer mon abonnement')}
    `),
  )
}

export async function sendSubscriptionCreatedEmail(
  email: string,
  name: string,
  planName: string,
): Promise<void> {
  await send(
    email,
    `Abonnement ${planName} activé — Notavex`,
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Votre abonnement est actif !</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bonjour ${name}, votre abonnement <strong>${planName}</strong> est maintenant actif. Vos crédits de minutes sont disponibles.
      </p>
      ${ctaButton(`${APP_URL}/dashboard`, 'Commencer à transcrire')}
      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        Vous pouvez gérer votre abonnement à tout moment depuis votre espace.
      </p>
    `),
  )
}

export async function sendCreditPurchaseEmail(
  email: string,
  name: string,
  minutes: number,
  amountCents: number,
): Promise<void> {
  const amount = (amountCents / 100).toFixed(2)
  await send(
    email,
    `Achat de ${minutes} minutes confirmé — Notavex`,
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Achat confirmé</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bonjour ${name}, votre achat de <strong>${minutes} minutes</strong> de transcription (${amount} €) a bien été pris en compte.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Vos crédits sont immédiatement disponibles dans votre espace.
      </p>
      ${ctaButton(`${APP_URL}/dashboard`, 'Utiliser mes crédits')}
    `),
  )
}

export async function sendLowCreditsEmail(
  email: string,
  name: string,
  remainingMinutes: number,
): Promise<void> {
  await send(
    email,
    'Il vous reste peu de crédits — Notavex',
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Crédits bientôt épuisés</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bonjour ${name}, il vous reste <strong>${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}</strong> de transcription.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Rechargez vos crédits ou passez à un plan supérieur pour continuer à transcrire vos morceaux.
      </p>
      ${ctaButton(`${APP_URL}/dashboard/subscription`, 'Recharger mes crédits')}
    `),
  )
}

export async function sendNoCreditsEmail(
  email: string,
  name: string,
): Promise<void> {
  await send(
    email,
    'Vos crédits sont épuisés — Notavex',
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Crédits épuisés</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bonjour ${name}, vous avez utilisé tous vos crédits de transcription.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Pour continuer à utiliser Notavex, achetez des crédits supplémentaires ou passez à un plan avec plus de minutes.
      </p>
      ${ctaButton(`${APP_URL}/dashboard/subscription`, 'Obtenir plus de crédits')}
    `),
  )
}

export async function sendPaymentFailedEmail(
  email: string,
  name: string,
): Promise<void> {
  await send(
    email,
    'Échec de paiement — Action requise — Notavex',
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Votre paiement a échoué</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bonjour ${name}, nous n'avons pas pu traiter votre paiement. Cela peut arriver si votre carte est expirée ou si les fonds sont insuffisants.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Mettez à jour votre moyen de paiement dès que possible pour éviter la suspension de votre abonnement.
      </p>
      ${ctaButton(`${APP_URL}/api/subscriptions/portal`, 'Mettre à jour mon moyen de paiement')}
      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        Si vous pensez qu'il s'agit d'une erreur, contactez-nous.
      </p>
    `),
  )
}

export async function sendSubscriptionCancelledEmail(
  email: string,
  name: string,
  periodEnd: Date,
): Promise<void> {
  const formattedDate = periodEnd.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  await send(
    email,
    'Annulation de votre abonnement confirmée — Notavex',
    baseTemplate(`
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Abonnement annulé</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Bonjour ${name}, votre abonnement a bien été annulé. Vous continuez à bénéficier de Notavex jusqu'au <strong>${formattedDate}</strong>.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Vous pouvez vous réabonner à tout moment depuis votre espace.
      </p>
      ${ctaButton(`${APP_URL}/dashboard/subscription`, 'Se réabonner')}
    `),
  )
}
