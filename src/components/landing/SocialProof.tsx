'use client'

import { motion } from 'framer-motion'

import { STATS } from '@/lib/constants'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const stats = [
  { value: STATS.musicians + '+', label: 'Musiciens' },
  { value: STATS.songsTranscribed, label: 'Partitions créées' },
  { value: STATS.countries + '+', label: 'Pays' },
]

const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Guitar Student',
    avatar: '🎸',
    quote:
      '"J\'ai économisé plus de 400 € en 3 mois. Notavex a rendu l\'apprentissage de la guitare accessible et agréable."',
    location: 'Austin, TX',
  },
  {
    name: 'James K.',
    role: 'Session Musician',
    avatar: '🎤',
    quote:
      '"Je passais 4–5 heures à transcrire pour des clients. Maintenant c\'est une affaire de minutes. Rentabilisé en une semaine."',
    location: 'Nashville, TN',
  },
  {
    name: 'Dr. Lisa Chen',
    role: 'Music Educator · Berklee',
    avatar: '🎹',
    quote:
      '"Je crée du matériel pour 30+ élèves. La séparation multi-instruments change tout pour enseigner l\'orchestration."',
    location: 'Boston, MA',
  },
  {
    name: 'Alex T.',
    role: 'Electronic Music Producer',
    avatar: '🎧',
    quote:
      '"La précision est impressionnante. J\'analyse les progressions de mes producteurs favoris. Vision aux rayons X de la musique."',
    location: 'Los Angeles, CA',
  },
  {
    name: 'The Midnight Groove',
    role: 'Cover Band',
    avatar: '🎵',
    quote:
      '"On a appris 20 chansons en 2 mois. Séparer les pistes de basse, guitare et batterie individuellement a tout changé."',
    location: 'Chicago, IL',
  },
  {
    name: 'Maria S.',
    role: 'Violoniste · NY Philharmonic',
    avatar: '🎻',
    quote:
      '"Notavex a capturé des nuances dynamiques subtiles que je n\'attendais pas. Excellent pour étudier les concertos."',
    location: 'New York, NY',
  },
]

export function SocialProof() {
  return (
    <section
      className="px-8 py-[100px]"
      style={{
        background: 'var(--nv-bg-1)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="mx-auto max-w-[1180px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-[84px] flex flex-wrap justify-center gap-12 md:gap-[88px]"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <span
                className="nv-grad-text mb-[7px] block text-[50px] font-bold leading-none tracking-[-0.03em]"
                style={{ backgroundPosition: '0% 50%' }}
              >
                {s.value}
              </span>
              <span
                className="uppercase tracking-[0.07em] text-white/45"
                style={{ ...mono, fontSize: 11 }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-3.5 text-center text-[42px] font-bold leading-tight tracking-[-0.03em] text-white/95"
          style={{ textWrap: 'balance' } as React.CSSProperties}
        >
          Plébiscité par les musiciens du monde entier
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="mx-auto mb-[64px] max-w-[560px] text-center text-[16px] text-white/72"
        >
          Plus de {STATS.musicians} guitaristes, pianistes, violonistes et
          producteurs font confiance à Notavex chaque jour.
        </motion.p>

        <div className="mb-14 grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-[16px] p-[26px] transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,107,53,0.28)'
                e.currentTarget.style.background = 'rgba(255,107,53,0.025)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
            >
              <div className="mb-3.5 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[20px]"
                  style={{ background: 'rgba(122,90,255,0.14)' }}
                >
                  {t.avatar}
                </div>
                <div>
                  <span className="block text-[14px] font-semibold text-white/95">
                    {t.name}
                  </span>
                  <span
                    className="block text-white/65"
                    style={{ ...mono, fontSize: 11 }}
                  >
                    {t.role}
                  </span>
                </div>
              </div>
              <div
                className="mb-3 tracking-[2px] text-[#ff6b35]"
                style={{ fontSize: 12 }}
              >
                ★★★★★
              </div>
              <p className="mb-2.5 text-[13px] leading-[1.65] text-white/72">
                {t.quote}
              </p>
              <span className="text-white/45" style={{ ...mono, fontSize: 11 }}>
                📍 {t.location}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-11 border-t pt-12"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2 text-[13px] font-medium text-white/72">
            <span className="tracking-[2px] text-[14px] text-[#ff6b35]">
              ★★★★★
            </span>
            {STATS.rating}/5 sur {STATS.reviewCount} avis
          </div>
          <span
            className="rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{
              background: 'rgba(122,90,255,0.09)',
              border: '1px solid rgba(122,90,255,0.2)',
              color: '#7a5aff',
              ...mono,
            }}
          >
            Remboursé sous 30 jours
          </span>
          <span className="text-[13px] text-white/45">
            Utilisé par 50+ écoles de musique
          </span>
        </motion.div>
      </div>
    </section>
  )
}
