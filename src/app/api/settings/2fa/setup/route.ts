import { settingsController } from '@/server/domains/settings'

export async function POST() {
  return settingsController.setup2FA()
}
