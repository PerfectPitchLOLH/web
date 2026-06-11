import type { OnboardingStep, TargetRect } from '@/hooks/useOnboardingTour'

const CARD_WIDTH = 320
const CARD_HEIGHT_ESTIMATE = 240
const CARD_GAP = 16
const VIEWPORT_MARGIN = 16
const MOBILE_BREAKPOINT = 640

export function computeCardPosition(
  spotlight: TargetRect,
  side: OnboardingStep['side'],
): { top: number; left: number } {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const cardWidth = Math.min(CARD_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2)

  // On small screens, side placements push the card off-screen — stack below instead
  const effectiveSide = viewportWidth < MOBILE_BREAKPOINT ? 'bottom' : side

  let top: number
  let left: number

  switch (effectiveSide) {
    case 'right':
      top = spotlight.top
      left = spotlight.left + spotlight.width + CARD_GAP
      break
    case 'left':
      top = spotlight.top
      left = spotlight.left - cardWidth - CARD_GAP
      break
    case 'top':
      top = spotlight.top - CARD_HEIGHT_ESTIMATE - CARD_GAP
      left = spotlight.left
      break
    case 'bottom':
    default:
      top = spotlight.top + spotlight.height + CARD_GAP
      left = spotlight.left
      break
  }

  if (left + cardWidth > viewportWidth - VIEWPORT_MARGIN) {
    left = viewportWidth - cardWidth - VIEWPORT_MARGIN
  }
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN

  if (top + CARD_HEIGHT_ESTIMATE > viewportHeight - VIEWPORT_MARGIN) {
    top = Math.max(
      VIEWPORT_MARGIN,
      spotlight.top - CARD_HEIGHT_ESTIMATE - CARD_GAP,
    )
  }
  if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN

  return { top, left }
}
