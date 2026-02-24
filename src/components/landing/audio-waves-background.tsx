'use client'

import { useResponsiveWaveAmplitude } from '@/hooks/use-responsive-wave-amplitude'

export function AudioWavesBackground() {
  const verticalSpacing = 23
  const amplitude = useResponsiveWaveAmplitude()
  const blur = 30
  const opacity = 0.95
  const strokeWidth = 25
  const speed = 8
  const phaseShift = 339

  const baseY = 350
  const wave2Y = baseY + verticalSpacing
  const wave3Y = baseY + verticalSpacing * 2

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={
        {
          zIndex: 0,
          '--speed-slow': `${speed + 5}s`,
          '--speed-medium': `${speed}s`,
          '--speed-fast': `${speed - 5}s`,
        } as React.CSSProperties
      }
    >
      <svg
        className="absolute w-full h-full"
        viewBox="0 0 1440 800"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="wave3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6b35" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>

        <g opacity={opacity} style={{ filter: `blur(${blur}px)` }}>
          <path
            d={`M${-720},${baseY} Q${-360},${baseY - amplitude} 0,${baseY} T720,${baseY} T1440,${baseY} T2160,${baseY}`}
            stroke="url(#wave1)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{ animation: 'wave-slow var(--speed-slow) linear infinite' }}
          />
          <path
            d={`M${-720 + phaseShift},${wave2Y} Q${-360 + phaseShift},${wave2Y - amplitude} ${phaseShift},${wave2Y} T${720 + phaseShift},${wave2Y} T${1440 + phaseShift},${wave2Y} T${2160 + phaseShift},${wave2Y}`}
            stroke="url(#wave2)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              animation: 'wave-medium var(--speed-medium) linear infinite',
            }}
          />
          <path
            d={`M${-720 + phaseShift * 2},${wave3Y} Q${-360 + phaseShift * 2},${wave3Y - amplitude} ${phaseShift * 2},${wave3Y} T${720 + phaseShift * 2},${wave3Y} T${1440 + phaseShift * 2},${wave3Y} T${2160 + phaseShift * 2},${wave3Y}`}
            stroke="url(#wave3)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{ animation: 'wave-fast var(--speed-fast) linear infinite' }}
          />
        </g>
      </svg>
    </div>
  )
}
