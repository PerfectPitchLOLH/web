import { settingsController } from '@/server/domains/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  return settingsController.getSettings()
}
