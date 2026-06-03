import type { NextRequest } from 'next/server'

import { settingsController } from '@/server/domains/settings'

export async function POST(request: NextRequest) {
  return settingsController.changePassword(request)
}
