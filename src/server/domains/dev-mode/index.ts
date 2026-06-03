import { DevModeController } from './dev-mode.controller'
import { DevModeService } from './dev-mode.service'

const devModeService = new DevModeService()
export const devModeController = new DevModeController(devModeService)

export * from './dev-mode.constants'
export * from './dev-mode.types'
