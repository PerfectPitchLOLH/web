'use client'

import { cn } from '@/lib/utils'

interface CircularProgressAvatarProps {
  children: React.ReactNode
  percentage: number
  className?: string
}

export function CircularProgressAvatar({
  children,
  percentage,
  className,
}: CircularProgressAvatarProps) {
  // Avatar size is 40px (size-10)
  const avatarSize = 40
  const strokeWidth = 2.5
  const radius = (avatarSize + strokeWidth * 2) / 2
  const normalizedRadius = radius - strokeWidth
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const svgSize = avatarSize + strokeWidth * 4

  const getStrokeColor = () => {
    if (percentage > 50) return '#10b981' // green-500
    if (percentage > 20) return '#f59e0b' // orange-500
    return '#ef4444' // red-500
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        className,
      )}
    >
      {/* SVG Ring */}
      <svg
        className="absolute -rotate-90"
        width={svgSize}
        height={svgSize}
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) rotate(-90deg)',
        }}
      >
        {/* Background circle */}
        <circle
          className="transition-all duration-500"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={normalizedRadius}
          cx={svgSize / 2}
          cy={svgSize / 2}
        />

        {/* Progress circle */}
        <circle
          className="transition-all duration-500"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={svgSize / 2}
          cy={svgSize / 2}
        />
      </svg>

      {/* Avatar content */}
      {children}
    </div>
  )
}
