import { NotificationController } from './notification.controller'
import { NotificationRepository } from './notification.repository'
import { NotificationService } from './notification.service'

const notificationRepository = new NotificationRepository()
const notificationService = new NotificationService(notificationRepository)
export const notificationController = new NotificationController(
  notificationService,
)

export { notificationRepository, notificationService }
export * from './notification.constants'
export * from './notification.types'
