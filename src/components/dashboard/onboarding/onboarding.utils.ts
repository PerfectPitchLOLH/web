import type { OnboardingStep, TargetRect } from '@/hooks/useOnboardingTour'

const CARD_WIDTH = 320
const CARD_GAP = 16
const VIEWPORT_MARGIN = 16

export function computeCardPosition(
  spotlight: TargetRect,
  side: OnboardingStep['side'],
): { top: number; left: number } {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let top: number
  let left: number

  switch (side) {
    case 'right':
      top = spotlight.top
      left = spotlight.left + spotlight.width + CARD_GAP
      break
    case 'left':
      top = spotlight.top
      left = spotlight.left - CARD_WIDTH - CARD_GAP
      break
    case 'top':
      top = spotlight.top - CARD_GAP
      left = spotlight.left
      break
    case 'bottom':
    default:
      top = spotlight.top + spotlight.height + CARD_GAP
      left = spotlight.left
      break
  }

  if (left + CARD_WIDTH > viewportWidth - VIEWPORT_MARGIN) {
    left = viewportWidth - CARD_WIDTH - VIEWPORT_MARGIN
  }
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN

  if (top + CARD_GAP > viewportHeight - VIEWPORT_MARGIN) {
    top = viewportHeight - VIEWPORT_MARGIN
  }
  if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN

  return { top, left }
}
