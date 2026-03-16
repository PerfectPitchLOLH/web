import { NotificationController } from './notification.controller'
import { NotificationRepository } from './notification.repository'
import { NotificationService } from './notification.service'
import { NotificationAdminController } from './notification-admin.controller'

const notificationRepository = new NotificationRepository()
const notificationService = new NotificationService(notificationRepository)
export const notificationController = new NotificationController(
  notificationService,
)
export const notificationAdminController = new NotificationAdminController(
  notificationService,
)

export { notificationRepository, notificationService }
export * from './notification.constants'
export * from './notification.types'
