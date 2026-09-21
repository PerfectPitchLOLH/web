import { NextIntlClientProvider } from 'next-intl'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import Home from '@/app/[locale]/(landing)/page'
import { routing } from '@/i18n/routing'

import deMessages from '../../../../messages/de.json'
import enMessages from '../../../../messages/en.json'
import esMessages from '../../../../messages/es.json'
import frMessages from '../../../../messages/fr.json'

vi.mock('@/i18n/navigation', async () => {
  const { createElement } = await import('react')
  return {
    Link: ({ href, children }: { href: string; children?: React.ReactNode }) =>
      createElement('a', { href }, children),
  }
})

const MESSAGES = {
  de: deMessages,
  en: enMessages,
  es: esMessages,
  fr: frMessages,
} as const

const FABRICATED = [
  'Berklee',
  'Philharmonic',
  '2.4M',
  '12,847',
  'Austin, TX',
  'Sarah M.',
]

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`]
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

function renderLanding(locale: keyof typeof MESSAGES) {
  const errors: unknown[] = []
  const html = renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="UTC"
      onError={(error) => errors.push(error)}
      getMessageFallback={({ namespace, key }) => `MISSING:${namespace}.${key}`}
    >
      <Home />
    </NextIntlClientProvider>,
  )
  return { html, errors }
}

describe('landing page', () => {
  it('exposes the locales covered by the messages', () => {
    expect([...routing.locales].sort()).toEqual(Object.keys(MESSAGES).sort())
  })

  it.each(routing.locales)(
    'renders %s without missing translations',
    (locale) => {
      const { html, errors } = renderLanding(locale)

      expect(errors).toEqual([])
      expect(html).not.toContain('MISSING:')
    },
  )

  it.each(routing.locales)(
    'renders %s without fabricated social proof',
    (locale) => {
      const { html } = renderLanding(locale)

      for (const claim of FABRICATED) {
        expect(html).not.toContain(claim)
      }
    },
  )

  it.each(routing.locales)(
    'ships no social proof namespace in %s',
    (locale) => {
      expect(MESSAGES[locale]).not.toHaveProperty('SocialProof')
    },
  )

  it.each(routing.locales)('keeps the %s keys aligned with en', (locale) => {
    expect(flattenKeys(MESSAGES[locale]).sort()).toEqual(
      flattenKeys(MESSAGES.en).sort(),
    )
  })
})
