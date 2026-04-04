export const PROTECTION_CONSTANTS = {
  OVERLAY_HIDE_DELAY: 100,
  BLUR_INTENSITY: '20px',
  CANVAS_SCALE: 2,
  CANVAS_BACKGROUND: '#ffffff',
} as const

export const SUSPICIOUS_ACTIVITY_TYPES = {
  CONTEXT_MENU: 'context-menu',
  DRAG_START: 'drag-start',
  SCREEN_SHARE: 'screen-share',
} as const

export type SuspiciousActivityType =
  (typeof SUSPICIOUS_ACTIVITY_TYPES)[keyof typeof SUSPICIOUS_ACTIVITY_TYPES]
