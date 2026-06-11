'use client'

import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const columnHrefs = [
  ['#features', '/comment-ca-marche', '#pricing', '/demo'],
  ['/docs', '/blog', '/tutoriels', '/changelog'],
  ['/about', '/carrieres', '/presse', '/contact'],
  ['/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/mentions'],
] as const

const columnKeys = ['product', 'resources', 'company', 'legal'] as const

function NotavexLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 44 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <circle cx="22" cy="22" r="21" strokeOpacity="0.28" />
      <ellipse cx="22" cy="22" rx="20" ry="9" />
      <ellipse cx="22" cy="22" rx="20" ry="9" transform="rotate(45 22 22)" />
      <ellipse cx="22" cy="22" rx="20" ry="9" transform="rotate(90 22 22)" />
      <ellipse cx="22" cy="22" rx="20" ry="9" transform="rotate(135 22 22)" />
      <circle cx="22" cy="22" r="3.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Footer() {
  const t = useTranslations('Footer')

  const columns = columnKeys.map((key, i) => ({
    title: t(`columns.${key}.title`),
    links: t.raw(`columns.${key}.links`) as string[],
    hrefs: columnHrefs[i],
  }))

  return (
    <footer
      className="px-8 pb-10 pt-20"
      style={{
        background: 'var(--nv-bg-1)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-16 grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)] md:gap-11">
          <div className="col-span-2 flex flex-col gap-5 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-white/95 no-underline"
            >
              <NotavexLogo />
              <span className="text-[15px] font-semibold">Notavex</span>
            </Link>
            <p
              className="max-w-[230px] text-[14px] leading-[1.65] text-white/65"
              style={{ textWrap: 'pretty' } as React.CSSProperties}
            >
              {t('tagline')}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <span
                className="mb-5 block uppercase tracking-[0.08em] text-white/45"
                style={{ ...mono, fontSize: 11, fontWeight: 500 }}
              >
                {col.title}
              </span>
              <ul className="flex flex-col gap-3">
                {col.links.map((label, i) => (
                  <li key={label}>
                    <Link
                      href={col.hrefs[i]}
                      className="text-[14px] text-white/72 no-underline transition-colors hover:text-white/95"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3.5 border-t pt-8"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <span className="text-[13px] text-white/45">{t('copyright')}</span>

          <div className="flex gap-2.5">
            <SocialLink href="#" label="GitHub">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </SocialLink>
            <SocialLink href="#" label="Twitter">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4l16 16M4 20L20 4" />
              </svg>
            </SocialLink>
            <SocialLink href="#" label="LinkedIn">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M7 10v7M7 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
              </svg>
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  )
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-[6px] text-white/65 no-underline transition-colors hover:text-white/95"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      {children}
    </a>
  )
}
