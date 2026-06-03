import { adminRepository } from '../admin'
import { userRepository } from '../user'
import { ImpersonationController } from './impersonation.controller'
import { ImpersonationRepository } from './impersonation.repository'
import { ImpersonationService } from './impersonation.service'
import { ImpersonationLogController } from './impersonation-log.controller'
import { ImpersonationLogRepository } from './impersonation-log.repository'
import { ImpersonationLogService } from './impersonation-log.service'

const impersonationRepository = new ImpersonationRepository()
export const impersonationService = new ImpersonationService(
  impersonationRepository,
  userRepository,
  adminRepository,
)
export const impersonationController = new ImpersonationController(
  impersonationService,
)

export const impersonationLogRepository = new ImpersonationLogRepository()
export const impersonationLogService = new ImpersonationLogService(
  impersonationLogRepository,
  adminRepository,
)
export const impersonationLogController = new ImpersonationLogController(
  impersonationLogService,
)

export * from './impersonation.constants'
export * from './impersonation.types'
export {
  ImpersonationLogController,
  ImpersonationLogRepository,
  ImpersonationLogService,
  ImpersonationRepository,
  ImpersonationService,
}
