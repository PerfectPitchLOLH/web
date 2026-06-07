'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import { STATS } from '@/lib/constants'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

type Testimonial = {
  quote: string
  name: string
  role: string
  location: string
}

export function SocialProof() {
  const t = useTranslations('SocialProof')
  const testimonials = t.raw('testimonials') as Testimonial[]

  const stats = [
    { value: STATS.musicians + '+', label: t('statsLabels.musicians') },
    { value: STATS.songsTranscribed, label: t('statsLabels.sheets') },
    { value: STATS.countries + '+', label: t('statsLabels.countries') },
  ]

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
          {t('title')}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="mx-auto mb-[64px] max-w-[560px] text-center text-[16px] text-white/72"
        >
          {t('subtitle', { count: STATS.musicians })}
        </motion.p>

        <div className="mb-14 grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item, i) => (
            <motion.div
              key={item.name}
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
              <div className="mb-3.5">
                <span className="block text-[14px] font-semibold text-white/95">
                  {item.name}
                </span>
                <span
                  className="block text-white/65"
                  style={{ ...mono, fontSize: 11 }}
                >
                  {item.role}
                </span>
              </div>
              <div
                className="mb-3 tracking-[2px] text-[#ff6b35]"
                style={{ fontSize: 12 }}
              >
                ★★★★★
              </div>
              <p className="mb-2.5 text-[13px] leading-[1.65] text-white/72">
                {item.quote}
              </p>
              <span className="text-white/45" style={{ ...mono, fontSize: 11 }}>
                {item.location}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
