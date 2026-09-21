import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CgvContent } from '@/components/legal/CgvContent'
import { CookiesContent } from '@/components/legal/CookiesContent'
import { MentionsContent } from '@/components/legal/MentionsContent'
import { PrivacyContent } from '@/components/legal/PrivacyContent'
import { TermsContent } from '@/components/legal/TermsContent'
import { HOSTING_PROVIDERS, LEGAL_IDENTITY } from '@/lib/legal-identity'

const render = (element: React.ReactElement) =>
  renderToStaticMarkup(element)
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')

describe('pages légales', () => {
  it('les CGV, les mentions légales et la politique de confidentialité lisent l’identité centralisée', () => {
    for (const html of [
      render(<CgvContent />),
      render(<MentionsContent />),
      render(<PrivacyContent />),
    ]) {
      expect(html).toContain(LEGAL_IDENTITY.siret)
      expect(html).not.toContain('XXXXXXXX')
      expect(html).not.toContain('Notavex SAS')
    }
  })

  it('les CGU ne présentent pas de forme juridique non vérifiée', () => {
    const html = render(<TermsContent />)

    expect(html).toContain(LEGAL_IDENTITY.companyName)
    expect(html).not.toContain('Notavex SAS')
  })

  it('les mentions légales listent les deux hébergeurs', () => {
    const html = render(<MentionsContent />)

    expect(html).toContain(HOSTING_PROVIDERS.web.name)
    expect(html).toContain(HOSTING_PROVIDERS.api.name)
  })

  it('les CGV décrivent la case de renonciation obligatoire et la trace conservée', () => {
    const html = render(<CgvContent />)

    expect(html).toContain('cocher une case')
    expect(html).toContain('version des présentes CGV')
  })

  it('la politique de confidentialité cite tous les sous-traitants réellement utilisés', () => {
    const html = render(<PrivacyContent />)

    for (const name of [
      'Stripe',
      'Resend',
      'Neon',
      'Upstash',
      'Vercel',
      'Modal',
      'PostHog',
      'Sentry',
      'Cloudflare Turnstile',
      'Google',
    ]) {
      expect(html).toContain(name)
    }
  })

  it('la politique de confidentialité ne place plus le traitement audio chez Vercel', () => {
    const html = render(<PrivacyContent />)

    expect(html).not.toContain('infrastructure hébergée chez Vercel')
    expect(html).toContain('Modal Labs, Inc.')
  })

  it('la page cookies décrit PostHog et non Vercel Analytics', () => {
    const html = render(<CookiesContent />)

    expect(html).toContain('PostHog')
    expect(html).not.toContain('Vercel Analytics')
    expect(html).not.toContain('Vercel Insights')
  })
})
