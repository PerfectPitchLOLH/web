'use client'

import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { PRICING } from '@/lib/constants'

const mono = { fontFamily: "'JetBrains Mono', monospace" }

const plans = [
  {
    key: 'junior',
    name: 'Junior',
    monthly: PRICING.junior.monthly,
    yearly: PRICING.junior.yearly,
    popular: false as const,
  },
  {
    key: 'basic',
    name: 'Basic',
    monthly: PRICING.basic.monthly,
    yearly: PRICING.basic.yearly,
    popular: true as const,
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: PRICING.pro.monthly,
    yearly: PRICING.pro.yearly,
    popular: false as const,
  },
]

function CheckIcon() {
  return (
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
  )
}

function CrossIcon() {
  return (
    <span
      className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[13px] leading-none text-white/45"
      style={{ border: '1px solid rgba(255,255,255,0.14)' }}
    >
      ×
    </span>
  )
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
}

function useCountUp(target: number, enabled: boolean) {
  const [value, setValue] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!enabled) return
    setValue(0)
    setDone(false)
    const duration = target > 1000 ? 2800 : target > 100 ? 2000 : 1400
    const startTime = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setValue(target)
        setDone(true)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, enabled])

  return { value, done }
}

export function PricingSection() {
  const t = useTranslations('Pricing')
  const [isAnnual, setIsAnnual] = useState(false)

  const compRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(compRef, { once: true, amount: 0.4 })

  const dimTarget = isAnnual ? 2700 : 225
  const hiTarget = isAnnual ? PRICING.junior.yearly : PRICING.junior.monthly

  const { value: dimValue, done: dimDone } = useCountUp(dimTarget, isInView)
  const { value: hiValue } = useCountUp(hiTarget, isInView)

  const dimDisplayed = Math.round(dimValue).toLocaleString('fr-FR') + ' €'
  const hiDisplayed = Math.floor(hiValue).toLocaleString('fr-FR') + ',99 €'

  const dimNote = t(isAnnual ? 'estimatedYearly' : 'estimatedMonthly')
  const hiNote = t(isAnnual ? 'perYear' : 'perMonth')

  const negativeBullets = t.raw('negativeBullets') as string[]
  const juniorFeatures = t.raw('juniorFeatures') as string[]
  const historyValues = t.raw('planFeatures.historyValues') as string[]

  const planFeatures: Array<{
    label: string
    values: (boolean | string)[]
  }> = [
    {
      label: t('planFeatures.transcription'),
      values: ['10 min', '20 min', '50 min'],
    },
    { label: t('planFeatures.fallingNotes'), values: [true, true, true] },
    { label: t('planFeatures.history'), values: historyValues },
    { label: t('planFeatures.polyphony'), values: [false, false, true] },
  ]

  return (
    <section
      className="px-8 py-[120px]"
      style={{ background: 'var(--nv-bg-1)' }}
      id="pricing"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="text-center">
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
            {t('title')}
            <span
              className="nv-grad-text block"
              style={{ backgroundPosition: '0% 50%' }}
            >
              {t('titleItalic')}
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
            {t('subtitle')}
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
            className="relative grid grid-cols-2 rounded-full p-1"
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
              className="relative z-10 cursor-pointer rounded-full px-6 py-2 text-[14px] transition-colors duration-300"
              style={{
                color: isAnnual ? 'rgba(255,255,255,0.6)' : 'white',
                fontWeight: isAnnual ? 400 : 600,
                background: 'transparent',
                border: 'none',
              }}
              onClick={() => setIsAnnual(false)}
            >
              {t('monthly')}
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
              {t('yearly')}{' '}
              <span
                className="ml-1.5 inline-block rounded-full px-[7px] py-[2px] text-[11px] font-semibold"
                style={{
                  background: 'rgba(76,217,100,0.14)',
                  border: '1px solid rgba(76,217,100,0.28)',
                  color: '#4cd964',
                }}
              >
                {t('yearlyBadge')}
              </span>
            </button>
          </div>
        </motion.div>

        <div
          ref={compRef}
          className="mx-auto mb-[60px] grid max-w-[1080px] grid-cols-1 gap-7 md:grid-cols-2"
        >
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
              {t('pieceTitle')}
            </span>
            <div className="mb-3 text-[18px] font-bold text-white/95">
              {t('pieceLabel')}
            </div>
            <div className="mb-8">
              <span className="relative mb-1 inline-block text-[62px] font-bold leading-none tracking-[-0.03em] text-white/95">
                {dimDisplayed}
                <span
                  className="pointer-events-none absolute left-[-4px] right-[-4px] overflow-hidden"
                  style={{
                    top: '50%',
                    height: 3,
                    borderRadius: 2,
                    transform: 'rotate(-6deg) translateY(-50%)',
                  }}
                >
                  <motion.span
                    className="block h-full w-full"
                    style={{ background: '#ff6b35', transformOrigin: '0 50%' }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: dimDone ? 1 : 0 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  />
                </span>
              </span>
              <span
                className="block text-white/45"
                style={{ ...mono, fontSize: 12 }}
              >
                {dimNote}
              </span>
            </div>
            <ul className="flex flex-col gap-3.5">
              {negativeBullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-[14px] text-white/72"
                >
                  <CrossIcon />
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
              {t('recommended')}
            </span>
            <span
              className="mb-3 block uppercase tracking-[0.08em] text-white/45"
              style={{ ...mono, fontSize: 11, fontWeight: 500 }}
            >
              {t('notavexLabel')}
            </span>
            <div className="mb-3 text-[18px] font-bold text-white/95">
              Notavex Junior
            </div>
            <div className="mb-8">
              <span
                className="nv-grad-text mb-1 block text-[62px] font-bold leading-none tracking-[-0.03em]"
                style={{ backgroundPosition: '0% 50%' }}
              >
                {hiDisplayed}
              </span>
              <span
                className="block text-white/45"
                style={{ ...mono, fontSize: 12 }}
              >
                {hiNote}
              </span>
            </div>
            <ul className="mb-10 flex flex-col gap-3.5">
              {juniorFeatures.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-[14px] text-white/72"
                >
                  <CheckIcon />
                  {b}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/signup"
              className="flex h-[50px] w-full items-center justify-center rounded-[10px] bg-white text-[15px] font-bold text-[#0a0612] no-underline transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_36px_rgba(255,255,255,0.18)]"
            >
              {t('tryFree')}
            </Link>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-[100px] max-w-[560px] text-center text-[15px] text-white/65"
        >
          {t.rich(isAnnual ? 'savingsYearly' : 'savingsMonthly', {
            strong: (chunks) => (
              <strong className="font-bold text-[#4cd964]">{chunks}</strong>
            ),
          })}
        </motion.p>

        <div
          className="mb-[64px] border-t pt-[64px]"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <motion.h3
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-[32px] font-bold tracking-[-0.02em] text-white/95"
          >
            {t('pickYourPlan')}
          </motion.h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const price = isAnnual ? plan.yearly : plan.monthly
            const note = t(isAnnual ? 'perYear' : 'perMonth')

            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 + i * 0.07 }}
                className="relative flex flex-col rounded-[20px] p-8"
                style={
                  plan.popular
                    ? {
                        background:
                          'linear-gradient(135deg, rgba(255,107,53,0.07), rgba(122,90,255,0.08))',
                        border: '1px solid rgba(255,107,53,0.38)',
                        boxShadow: '0 0 50px rgba(255,107,53,0.07)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }
                }
              >
                {plan.popular && (
                  <span
                    className="absolute right-6 top-[-13px] rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-white"
                    style={{
                      background:
                        'linear-gradient(95deg, #ff6b35 0%, #ff4ec0 45%, #7a5aff 100%)',
                      ...mono,
                    }}
                  >
                    {t('mostPopular')}
                  </span>
                )}

                <div className="mb-6">
                  <span className="mb-3 block text-[22px] font-bold text-white/95">
                    {plan.name}
                  </span>
                  <span
                    className="block text-[40px] font-bold leading-none tracking-[-0.03em]"
                    style={
                      plan.popular
                        ? {
                            background:
                              'linear-gradient(95deg, #ff6b35, #ff4ec0, #7a5aff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }
                        : { color: 'rgba(255,255,255,0.95)' }
                    }
                  >
                    {fmt(price)} €
                  </span>
                  <span
                    className="mt-1 block text-white/40"
                    style={{ ...mono, fontSize: 11 }}
                  >
                    {note}
                  </span>
                </div>

                <ul className="mb-8 flex flex-1 flex-col gap-3">
                  {planFeatures.map((feat) => {
                    const val = feat.values[i]
                    return (
                      <li
                        key={feat.label}
                        className="flex items-start gap-3 text-[13px] text-white/72"
                      >
                        {typeof val === 'boolean' ? (
                          val ? (
                            <CheckIcon />
                          ) : (
                            <CrossIcon />
                          )
                        ) : (
                          <CheckIcon />
                        )}
                        <span>
                          {feat.label}
                          {typeof val === 'string' && (
                            <span
                              className="ml-1 text-white/45"
                              style={{ ...mono, fontSize: 11 }}
                            >
                              — {val}
                            </span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <Link
                  href="/auth/signup"
                  className="flex h-[46px] items-center justify-center rounded-[10px] text-[14px] font-semibold no-underline transition-all hover:-translate-y-0.5"
                  style={
                    plan.popular
                      ? { background: '#fff', color: '#0a0612' }
                      : {
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.85)',
                        }
                  }
                >
                  {t('choosePlan')}
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
