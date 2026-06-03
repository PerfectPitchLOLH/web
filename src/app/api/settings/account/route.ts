import { settingsController } from '@/server/domains/settings'

export async function DELETE() {
  return settingsController.deleteAccount()
}
