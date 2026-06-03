'use client'

import { useResponsiveWaveAmplitude } from '@/hooks/useResponsiveWaveAmplitude'

export function AudioWavesBackground() {
  const verticalSpacing = 23
  const amplitude = useResponsiveWaveAmplitude()
  const blur = 30
  const opacity = 0.95
  const strokeWidth = 25
  const speed = 20

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
            d={`M0,${baseY} Q360,${baseY - amplitude} 720,${baseY} T1440,${baseY} T2160,${baseY} T2880,${baseY} T3600,${baseY} T4320,${baseY}`}
            stroke="url(#wave1)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              animation: 'wave-slow var(--speed-slow) linear infinite',
              animationDelay: '0s',
            }}
          />
          <path
            d={`M0,${wave2Y} Q360,${wave2Y - amplitude} 720,${wave2Y} T1440,${wave2Y} T2160,${wave2Y} T2880,${wave2Y} T3600,${wave2Y} T4320,${wave2Y}`}
            stroke="url(#wave2)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              animation: 'wave-medium var(--speed-medium) linear infinite',
              animationDelay: '-3s',
            }}
          />
          <path
            d={`M0,${wave3Y} Q360,${wave3Y - amplitude} 720,${wave3Y} T1440,${wave3Y} T2160,${wave3Y} T2880,${wave3Y} T3600,${wave3Y} T4320,${wave3Y}`}
            stroke="url(#wave3)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            style={{
              animation: 'wave-fast var(--speed-fast) linear infinite',
              animationDelay: '-6s',
            }}
          />
        </g>
      </svg>
    </div>
  )
}
