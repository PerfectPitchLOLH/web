'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const negativeBullets = [
  '9 € par partition',
  "Formats limités à l'achat",
  'Aucune sauvegarde cloud',
  'Support standard uniquement',
]

const positiveBullets = [
  'Transcriptions illimitées',
  'Séparation multi-instruments',
  'Tous les formats (PDF, MIDI, MusicXML, GP)',
  'Partitions éditables en ligne',
  'Stockage cloud & synchronisation',
  'Support prioritaire & accès anticipé',
]

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)

  const dimPrice = isAnnual ? '2 700 €' : '225 €'
  const dimNote = isAnnual
    ? 'estimé pour 300 partitions/an'
    : 'estimé pour 25 partitions/mois'
  const hiPrice = isAnnual ? '229 €' : '19 €'
  const hiNote = isAnnual ? '/ an — tout inclus' : '/ mois — tout inclus'
  const hiName = isAnnual ? 'Annuel' : 'Mensuel'

  return (
    <section
      className="px-8 py-[120px]"
      style={{ background: 'var(--nv-bg-1)' }}
      id="pricing"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-5 block uppercase tracking-[0.08em] text-[#ff6b35]"
            style={{ ...mono, fontSize: 12, fontWeight: 500 }}
          >
            §02 — pricing
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="mb-8 font-bold text-white/95"
            style={{
              fontSize: 'clamp(64px, 11vw, 140px)',
              lineHeight: 0.96,
              letterSpacing: '-0.04em',
              textWrap: 'balance',
            }}
          >
            Le tarif que vos partitions
            <span
              className="nv-grad-text block"
              style={{ backgroundPosition: '0% 50%' }}
            >
              méritent.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mb-[60px] max-w-[760px] text-[17px] leading-[1.7] text-white/72"
            style={{ textWrap: 'pretty' } as React.CSSProperties}
          >
            Achetez vos partitions une par une à 9 € chacune — ou payez 19
            €/mois pour un accès illimité. À 25 partitions par mois, Notavex
            s&apos;autofinance en moins d&apos;une semaine.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mb-[68px] flex justify-center"
        >
          <div
            className="relative inline-flex gap-0 rounded-full p-1"
            style={{
              background: 'rgba(255,255,255,0.055)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-1 z-0 rounded-full transition-transform duration-300"
              style={{
                width: 'calc(50% - 4px)',
                background:
                  'linear-gradient(95deg, #ff6b35 0%, #ff4ec0 45%, #7a5aff 100%)',
                transform: isAnnual ? 'translateX(100%)' : 'translateX(0)',
              }}
            />
            <button
              className="relative z-10 cursor-pointer rounded-full px-6 py-2 text-[14px] font-medium transition-colors duration-300"
              style={{
                color: isAnnual ? 'rgba(255,255,255,0.6)' : 'white',
                fontWeight: isAnnual ? 400 : 600,
                background: 'transparent',
                border: 'none',
              }}
              onClick={() => setIsAnnual(false)}
            >
              Au mois
            </button>
            <button
              className="relative z-10 cursor-pointer rounded-full px-6 py-2 text-[14px] transition-colors duration-300"
              style={{
                color: isAnnual ? 'white' : 'rgba(255,255,255,0.6)',
                fontWeight: isAnnual ? 600 : 400,
                background: 'transparent',
                border: 'none',
              }}
              onClick={() => setIsAnnual(true)}
            >
              À l&apos;année{' '}
              <span
                className="ml-1.5 inline-block rounded-full px-[7px] py-[2px] text-[11px] font-semibold"
                style={{
                  background: 'rgba(76,217,100,0.14)',
                  border: '1px solid rgba(76,217,100,0.28)',
                  color: '#4cd964',
                }}
              >
                −92%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="mx-auto mb-[60px] grid max-w-[1080px] grid-cols-1 gap-7 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative rounded-[20px] p-10 opacity-80"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span
              className="mb-3 block uppercase tracking-[0.08em] text-white/45"
              style={{ ...mono, fontSize: 11, fontWeight: 500 }}
            >
              Achat à la pièce
            </span>
            <div className="mb-3 text-[18px] font-bold text-white/95">
              Par partition
            </div>
            <div className="mb-8">
              <span
                className="relative mb-1 inline-block text-[62px] font-bold leading-none tracking-[-0.03em] text-white/95"
                style={{
                  position: 'relative',
                }}
              >
                {dimPrice}
                <span
                  className="pointer-events-none absolute left-[-4px] right-[-4px]"
                  style={{
                    top: '50%',
                    height: 3,
                    background: '#ff6b35',
                    transform: 'rotate(-6deg) translateY(-50%)',
                    borderRadius: 2,
                  }}
                />
              </span>
              <span
                className="block text-white/45"
                style={{ ...mono, fontSize: 12 }}
              >
                {dimNote}
              </span>
            </div>
            <ul className="mb-10 flex flex-col gap-3.5">
              {negativeBullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-[14px] text-white/72"
                >
                  <span
                    className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[13px] leading-none text-white/45"
                    style={{ border: '1px solid rgba(255,255,255,0.14)' }}
                  >
                    ×
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="relative rounded-[20px] p-10"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,107,53,0.07), rgba(122,90,255,0.08))',
              border: '1px solid rgba(255,107,53,0.38)',
              boxShadow: '0 0 70px rgba(255,107,53,0.09)',
            }}
          >
            <span
              className="absolute right-8 top-[-13px] rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-white"
              style={{
                background:
                  'linear-gradient(95deg, #ff6b35 0%, #ff4ec0 45%, #7a5aff 100%)',
                ...mono,
              }}
            >
              Recommandé
            </span>

            <span
              className="mb-3 block uppercase tracking-[0.08em] text-white/45"
              style={{ ...mono, fontSize: 11, fontWeight: 500 }}
            >
              Notavex
            </span>
            <div className="mb-3 text-[18px] font-bold text-white/95">
              {hiName}
            </div>
            <div className="mb-8">
              <span
                className="nv-grad-text mb-1 block text-[62px] font-bold leading-none tracking-[-0.03em]"
                style={{ backgroundPosition: '0% 50%' }}
              >
                {hiPrice}
              </span>
              <span
                className="block text-white/45"
                style={{ ...mono, fontSize: 12 }}
              >
                {hiNote}
              </span>
            </div>
            <ul className="mb-10 flex flex-col gap-3.5">
              {positiveBullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-[14px] text-white/72"
                >
                  <span
                    className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background:
                        'linear-gradient(95deg, #ff6b35 0%, #ff4ec0 45%, #7a5aff 100%)',
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke="white"
                      strokeWidth="1.6"
                    >
                      <polyline points="1.5,5.5 4,8 8.5,2" />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <button
              className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-white text-[15px] font-bold text-[#0a0612] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_36px_rgba(255,255,255,0.18)]"
              style={{ border: 'none' }}
            >
              Démarrer l&apos;essai gratuit →
            </button>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-[560px] text-center text-[15px] text-white/65"
        >
          {isAnnual ? (
            <>
              Économisez{' '}
              <strong className="font-bold text-[#4cd964]">2 471 €/an</strong>{' '}
              avec le plan annuel — l&apos;abonnement se paie en 2
              transcriptions.
            </>
          ) : (
            <>
              Économisez{' '}
              <strong className="font-bold text-[#4cd964]">206 €/mois</strong>{' '}
              en passant à Notavex — remboursé dès la 3e partition.
            </>
          )}
        </motion.p>
      </div>
    </section>
  )
}
