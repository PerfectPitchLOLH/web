'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { AnimatedTooltip } from '@/components/ui/animated-tooltip'
import { STATS } from '@/lib/constants'

const musicians = [
  {
    id: 1,
    name: 'Céline',
    designation: 'Jazz Pianist',
    image: '/users/celine.jpg',
  },
  {
    id: 2,
    name: 'Louis',
    designation: 'Guitar Teacher',
    image: '/users/louis.jpg',
  },
  {
    id: 3,
    name: 'Nathan',
    designation: 'Classical Violinist',
    image: '/users/nathan.jpg',
  },
  {
    id: 4,
    name: 'Shan',
    designation: 'Music Producer',
    image: '/users/shan.jpg',
  },
  { id: 5, name: 'Yafei', designation: 'Composer', image: '/users/yafei.jpg' },
]

const mono = { fontFamily: "'JetBrains Mono', monospace" }

export function HeroSection() {
  const [waveHeights, setWaveHeights] = useState<number[]>([])
  const [gradShifted, setGradShifted] = useState(false)

  useEffect(() => {
    setWaveHeights(
      Array.from({ length: 90 }, (_, i) => {
        const t = i / 90
        const noise = (Math.random() - 0.5) * 0.55
        const h = Math.abs(Math.sin(t * Math.PI * 1.4) * 0.7 + noise)
        return Math.max(0.06, Math.min(h, 0.96))
      }),
    )
    const id = setInterval(() => setGradShifted((s) => !s), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8 pb-[110px] pt-[90px]"
      style={{ background: 'var(--nv-bg-0)' }}
      id="overview"
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'linear-gradient(180deg, #0a0612 0%, #1a0c2e 50%, #0a0612 100%)',
        }}
      />

      <div
        className="nv-aurora absolute rounded-full"
        style={{
          width: 640,
          height: 640,
          top: -120,
          left: -180,
          background:
            'radial-gradient(closest-side, rgba(255,107,53,0.32), transparent)',
          filter: 'blur(60px)',
          animation: 'nvAurora1 18s ease-in-out infinite',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <div
        className="nv-aurora absolute rounded-full"
        style={{
          width: 720,
          height: 720,
          top: -160,
          right: -220,
          background:
            'radial-gradient(closest-side, rgba(122,90,255,0.38), transparent)',
          filter: 'blur(60px)',
          animation: 'nvAurora2 22s ease-in-out infinite',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <div
        className="nv-aurora absolute rounded-full"
        style={{
          width: 520,
          height: 520,
          bottom: -40,
          left: '50%',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(closest-side, rgba(0,200,255,0.26), transparent)',
          filter: 'blur(60px)',
          animation: 'nvAurora3 26s ease-in-out infinite',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 30%, transparent 28%, black 72%)',
          maskImage:
            'radial-gradient(ellipse at 50% 30%, transparent 28%, black 72%)',
        }}
      />

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[3] h-[220px]"
        style={{
          background: 'linear-gradient(to bottom, transparent, #06030d)',
        }}
      />

      <div className="relative z-[4] mx-auto w-full max-w-[1280px]">
        {/* Two-column split */}
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16 xl:gap-20">
          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col items-start text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-9 inline-flex items-center gap-[9px] rounded-full px-4 py-2"
              style={{
                background: 'rgba(255,255,255,0.055)',
                border: '1px solid rgba(255,255,255,0.11)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                className="nv-pulse h-[7px] w-[7px] flex-shrink-0 rounded-full"
                style={{
                  background: 'var(--nv-live)',
                  animation: 'nvLivePulse 2s ease-in-out infinite',
                }}
              />
              <span
                className="text-xs font-medium tracking-[0.025em] text-white/70"
                style={mono}
              >
                Polyphonic engine — disponible maintenant
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 font-bold text-white/95"
              style={
                {
                  fontSize: 'clamp(44px, 5vw, 76px)',
                  lineHeight: 0.97,
                  letterSpacing: '-0.035em',
                  textWrap: 'balance',
                } as React.CSSProperties
              }
            >
              L&apos;infrastructure de
              <br />
              transcription musicale,
              <span
                className="nv-grad-text block"
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontStyle: 'italic',
                  fontWeight: 500,
                  backgroundPosition: gradShifted ? '100% 50%' : '0% 50%',
                  transition: 'background-position 1.2s ease',
                }}
              >
                au service des musiciens.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-10 max-w-[500px] text-[17px] leading-[1.65] text-white/72"
              style={{ textWrap: 'pretty' } as React.CSSProperties}
            >
              Une API et une app pour convertir n&apos;importe quel audio en
              partition, tablature et falling notes — avec une précision studio.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-10 flex flex-wrap gap-3"
            >
              <Link
                href="/auth/signup"
                className="inline-flex h-[46px] items-center gap-1.5 rounded-full bg-white px-6 text-[15px] font-semibold text-[#0a0612] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(255,107,53,0.38)]"
              >
                Démarrer maintenant →
              </Link>
              <Link
                href="#"
                className="inline-flex h-[46px] items-center rounded-full px-6 text-[15px] font-medium text-white/95 transition-all hover:bg-white/10"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                Parler à l&apos;équipe
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col items-start gap-3"
            >
              <AnimatedTooltip items={musicians} />
              <p className="flex items-center gap-2 text-[13px] text-white/65">
                <span
                  className="nv-pulse h-[7px] w-[7px] flex-shrink-0 rounded-full"
                  style={{
                    background: 'var(--nv-cool-b)',
                    animation: 'nvCyanPulse 2.2s 0.4s ease-in-out infinite',
                  }}
                />
                Rejoignez {STATS.musicians}+ musiciens qui économisent 5+ heures
                par transcription
              </p>
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN — mock product ── */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.35 }}
            className="relative hidden lg:block"
            style={{ perspective: '1400px', height: 460 }}
            id="features"
          >
            {/* Back card: waveform */}
            <div
              className="absolute rounded-[14px]"
              style={{
                width: '88%',
                top: 36,
                left: 0,
                zIndex: 1,
                background: 'rgba(22,10,40,0.92)',
                border: '1px solid rgba(255,255,255,0.09)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                transform: 'rotate(-3deg)',
                padding: '20px 22px',
              }}
            >
              <div
                className="mb-4 flex items-center gap-2 text-white/65"
                style={{ ...mono, fontSize: 11 }}
              >
                <span>AUDIO_INPUT.WAV</span>
                <span className="opacity-40">·</span>
                <span>4:18</span>
                <div
                  className="ml-auto flex items-center gap-[5px] rounded-full px-[9px] py-[3px] text-[10px] font-medium"
                  style={{
                    background: 'rgba(255,78,192,0.1)',
                    border: '1px solid rgba(255,78,192,0.28)',
                    color: '#ff4ec0',
                    ...mono,
                  }}
                >
                  <span
                    className="nv-pulse h-[5px] w-[5px] rounded-full"
                    style={{
                      background: '#ff4ec0',
                      animation: 'nvPinkPulse 1.6s ease-in-out infinite',
                    }}
                  />
                  ANALYZING
                </div>
              </div>

              <div className="mb-[14px] flex h-[68px] items-center overflow-hidden">
                {waveHeights.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 5,
                      flexShrink: 0,
                      height: Math.round(h * 68),
                      borderRadius: 2,
                      background: 'linear-gradient(to top, #7a5aff, #00c8ff)',
                      opacity: 0.4 + h * 0.55,
                      marginRight: 1,
                    }}
                  />
                ))}
              </div>

              <div
                className="flex flex-wrap gap-[10px] text-white/45"
                style={{ ...mono, fontSize: 10 }}
              >
                {[
                  '0:00',
                  '·',
                  'POLYPHONIC',
                  '·',
                  '44.1kHz',
                  '·',
                  '24-bit',
                  '·',
                  '4:18',
                ].map((t, i) => (
                  <span key={i} className={t === '·' ? 'opacity-40' : ''}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Front card: sheet music */}
            <div
              className="absolute rounded-[14px]"
              style={{
                width: '78%',
                top: 0,
                right: 0,
                zIndex: 2,
                background: '#fdfcfa',
                boxShadow:
                  '0 40px 100px rgba(0,0,0,0.52), 0 0 0 1px rgba(0,0,0,0.04)',
                color: '#1a1612',
                transform: 'rotate(2deg)',
                padding: '22px 26px',
              }}
            >
              <div className="mb-0.5 text-[14px] font-bold text-[#1a1612]">
                Wonderwall — Oasis
              </div>
              <div
                className="mb-3 text-[#999]"
                style={{ ...mono, fontSize: 10, letterSpacing: '0.02em' }}
              >
                Em · 4/4 · 84 bpm
              </div>

              <StaffSVG />

              <div className="flex flex-wrap items-center gap-1.5">
                {['MusicXML', 'MIDI', 'PDF', 'GP'].map((fmt) => (
                  <span
                    key={fmt}
                    className="inline-flex h-[22px] items-center rounded px-2.5 text-[10px] font-medium text-white"
                    style={{
                      ...mono,
                      background:
                        'linear-gradient(95deg, #ff6b35, #ff4ec0, #7a5aff)',
                    }}
                  >
                    {fmt}
                  </span>
                ))}
                <span
                  className="ml-auto inline-flex h-[22px] items-center rounded px-2.5 text-[10px] font-semibold"
                  style={{
                    ...mono,
                    background: 'rgba(26,22,18,0.1)',
                    border: '1px solid rgba(26,22,18,0.14)',
                    color: '#444',
                  }}
                >
                  EXPORT
                </span>
              </div>
            </div>

            {/* Chip: time */}
            <div
              className="absolute rounded-[14px] text-center"
              style={{
                width: 120,
                top: -12,
                right: 16,
                zIndex: 3,
                background: 'white',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 12px 44px rgba(0,0,0,0.28)',
                color: '#1a1612',
                transform: 'rotate(4deg)',
                padding: '12px 14px',
              }}
            >
              <span
                className="mb-1 block uppercase tracking-[0.07em] text-[#aaa]"
                style={{ ...mono, fontSize: 9, fontWeight: 500 }}
              >
                Transcrit en
              </span>
              <span className="block text-[20px] font-bold leading-none text-[#0a0612]">
                28s
              </span>
            </div>
          </motion.div>
        </div>

        {/* People strip — full width below */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.75 }}
          className="mt-20 flex flex-col items-center gap-6"
        >
          <span
            className="uppercase tracking-[0.07em] text-white/45"
            style={{ ...mono, fontSize: 11 }}
          >
            Ils font déjà confiance
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {musicians.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-2.5">
                <div
                  className="overflow-hidden rounded-full"
                  style={{
                    width: 56,
                    height: 56,
                    border: '2px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  <Image
                    src={m.image}
                    alt={m.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <span className="block text-[13px] font-semibold text-white/85">
                    {m.name}
                  </span>
                  <span
                    className="block text-white/40"
                    style={{ ...mono, fontSize: 10 }}
                  >
                    {m.designation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function StaffSVG() {
  return (
    <svg
      className="mb-4 block h-auto w-full"
      viewBox="0 0 504 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {[22, 32, 42, 52, 62].map((y) => (
        <line
          key={y}
          x1="36"
          y1={y}
          x2="496"
          y2={y}
          stroke="#2a2318"
          strokeWidth="0.9"
        />
      ))}
      <text
        x="36"
        y="72"
        fontFamily="Georgia,serif"
        fontSize="62"
        fill="#2a2318"
      >
        𝄞
      </text>
      <text
        x="90"
        y="48"
        fontFamily="Georgia,serif"
        fontSize="17"
        fontWeight="bold"
        fill="#2a2318"
        textAnchor="middle"
      >
        4
      </text>
      <text
        x="90"
        y="63"
        fontFamily="Georgia,serif"
        fontSize="17"
        fontWeight="bold"
        fill="#2a2318"
        textAnchor="middle"
      >
        4
      </text>
      <ellipse
        cx="118"
        cy="62"
        rx="5.5"
        ry="4"
        transform="rotate(-14 118 62)"
        fill="#2a2318"
      />
      <line
        x1="123"
        y1="62"
        x2="123"
        y2="32"
        stroke="#2a2318"
        strokeWidth="1.3"
      />
      <ellipse
        cx="148"
        cy="52"
        rx="5.5"
        ry="4"
        transform="rotate(-14 148 52)"
        fill="#2a2318"
      />
      <line
        x1="153"
        y1="52"
        x2="153"
        y2="22"
        stroke="#2a2318"
        strokeWidth="1.3"
      />
      <ellipse
        cx="178"
        cy="42"
        rx="5.5"
        ry="4"
        transform="rotate(-14 178 42)"
        fill="#2a2318"
      />
      <line
        x1="183"
        y1="42"
        x2="183"
        y2="22"
        stroke="#2a2318"
        strokeWidth="1.3"
      />
      <ellipse
        cx="208"
        cy="32"
        rx="5.5"
        ry="4"
        transform="rotate(-14 208 32)"
        fill="#2a2318"
      />
      <line
        x1="213"
        y1="32"
        x2="213"
        y2="12"
        stroke="#2a2318"
        strokeWidth="1.3"
      />
      <line
        x1="232"
        y1="22"
        x2="232"
        y2="62"
        stroke="#2a2318"
        strokeWidth="1.2"
      />
      <ellipse
        cx="250"
        cy="57"
        rx="5"
        ry="3.8"
        transform="rotate(-14 250 57)"
        fill="#2a2318"
      />
      <line
        x1="255"
        y1="57"
        x2="255"
        y2="28"
        stroke="#2a2318"
        strokeWidth="1.2"
      />
      <ellipse
        cx="275"
        cy="62"
        rx="5"
        ry="3.8"
        transform="rotate(-14 275 62)"
        fill="#2a2318"
      />
      <line
        x1="280"
        y1="62"
        x2="280"
        y2="28"
        stroke="#2a2318"
        strokeWidth="1.2"
      />
      <rect x="255" y="24" width="25" height="4.5" fill="#2a2318" />
      <ellipse
        cx="303"
        cy="52"
        rx="5"
        ry="3.8"
        transform="rotate(-14 303 52)"
        fill="#2a2318"
      />
      <line
        x1="308"
        y1="52"
        x2="308"
        y2="24"
        stroke="#2a2318"
        strokeWidth="1.2"
      />
      <ellipse
        cx="328"
        cy="57"
        rx="5"
        ry="3.8"
        transform="rotate(-14 328 57)"
        fill="#2a2318"
      />
      <line
        x1="333"
        y1="57"
        x2="333"
        y2="24"
        stroke="#2a2318"
        strokeWidth="1.2"
      />
      <rect x="308" y="20" width="25" height="4.5" fill="#2a2318" />
      <line
        x1="352"
        y1="22"
        x2="352"
        y2="62"
        stroke="#2a2318"
        strokeWidth="1.2"
      />
      <ellipse
        cx="376"
        cy="42"
        rx="5.5"
        ry="4"
        transform="rotate(-14 376 42)"
        fill="none"
        stroke="#2a2318"
        strokeWidth="1.3"
      />
      <line
        x1="381"
        y1="42"
        x2="381"
        y2="22"
        stroke="#2a2318"
        strokeWidth="1.3"
      />
      <ellipse
        cx="418"
        cy="52"
        rx="5.5"
        ry="4"
        transform="rotate(-14 418 52)"
        fill="#2a2318"
      />
      <line
        x1="423"
        y1="52"
        x2="423"
        y2="22"
        stroke="#2a2318"
        strokeWidth="1.3"
      />
      <line
        x1="444"
        y1="22"
        x2="444"
        y2="62"
        stroke="#2a2318"
        strokeWidth="1.2"
      />
      <ellipse
        cx="470"
        cy="42"
        rx="6"
        ry="4.5"
        transform="rotate(-14 470 42)"
        fill="none"
        stroke="#2a2318"
        strokeWidth="1.5"
      />
      <line
        x1="492"
        y1="22"
        x2="492"
        y2="62"
        stroke="#2a2318"
        strokeWidth="1.2"
      />
      <line
        x1="496"
        y1="22"
        x2="496"
        y2="62"
        stroke="#2a2318"
        strokeWidth="3.5"
      />
      {[100, 110, 120].map((y) => (
        <line
          key={y}
          x1="4"
          y1={y}
          x2="496"
          y2={y}
          stroke="#2a2318"
          strokeWidth="0.9"
          strokeOpacity="0.4"
        />
      ))}
      <rect x="0" y="90" width="504" height="42" fill="url(#staffFade)" />
      <defs>
        <linearGradient id="staffFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdfcfa" stopOpacity="0" />
          <stop offset="100%" stopColor="#fdfcfa" stopOpacity="1" />
        </linearGradient>
      </defs>
    </svg>
  )
}
