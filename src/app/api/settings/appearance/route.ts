import type { NextRequest } from 'next/server'

import { settingsController } from '@/server/domains/settings'

export async function PATCH(request: NextRequest) {
  return settingsController.updateAppearance(request)
}
