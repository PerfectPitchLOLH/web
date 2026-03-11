import { SettingsController } from './settings.controller'
import { SettingsRepository } from './settings.repository'
import { SettingsService } from './settings.service'

const settingsRepository = new SettingsRepository()
const settingsService = new SettingsService(settingsRepository)
export const settingsController = new SettingsController(settingsService)

export * from './settings.types'
