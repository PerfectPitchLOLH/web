import { ContactForm } from './ContactForm'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

export function ContactPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center px-8 pb-24 pt-36 text-center"
      style={{ background: 'var(--nv-bg-0)' }}
    >
      <span
        className="mb-6 inline-flex items-center rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-white/55"
        style={{
          ...mono,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        Support
      </span>
      <h1
        className="nv-grad-text mb-4 font-bold leading-tight tracking-[-0.03em]"
        style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          backgroundPosition: '0% 50%',
        }}
      >
        Contactez-nous
      </h1>
      <p className="mb-12 max-w-[460px] text-[15px] leading-relaxed text-white/55">
        Une question, un problème de paiement, une suggestion ? Choisissez une
        catégorie et écrivez-nous — on répond vite.
      </p>
      <ContactForm />
    </main>
  )
}
