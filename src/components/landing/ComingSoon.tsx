import Link from 'next/link'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

export function ComingSoon({
  title,
  tag,
  description,
}: {
  title: string
  tag?: string
  description?: string
}) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-8 text-center"
      style={{ background: 'var(--nv-bg-0)' }}
    >
      {tag && (
        <span
          className="mb-6 inline-flex items-center rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-white/55"
          style={{
            ...mono,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {tag}
        </span>
      )}
      <h1
        className="nv-grad-text mb-4 font-bold leading-tight tracking-[-0.03em]"
        style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          backgroundPosition: '0% 50%',
        }}
      >
        {title}
      </h1>
      <p className="mb-9 max-w-[420px] text-[15px] leading-relaxed text-white/55">
        {description ?? 'Cette page arrive bientôt.'}
      </p>
      <Link
        href="/"
        className="inline-flex h-[42px] items-center rounded-full bg-white px-5 text-[14px] font-semibold text-[#0a0612] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(255,107,53,0.35)]"
      >
        ← Retour à l&apos;accueil
      </Link>
    </main>
  )
}
