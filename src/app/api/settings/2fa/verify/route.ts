import type { NextRequest } from 'next/server'

import { settingsController } from '@/server/domains/settings'

export async function POST(request: NextRequest) {
  return settingsController.verify2FA(request)
}

export async function DELETE(request: NextRequest) {
  return settingsController.disable2FA(request)
}
