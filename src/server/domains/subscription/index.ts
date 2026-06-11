import { creditService } from '../credit'
import { creditPurchaseRepository } from '../credit-purchase'
import { notificationService } from '../notification'
import { SubscriptionController } from './subscription.controller'
import { SubscriptionRepository } from './subscription.repository'
import { SubscriptionService } from './subscription.service'

const subscriptionRepository = new SubscriptionRepository()
const subscriptionService = new SubscriptionService(
  subscriptionRepository,
  creditService,
  creditPurchaseRepository,
  notificationService,
)
export const subscriptionController = new SubscriptionController(
  subscriptionService,
)

export { subscriptionRepository, subscriptionService }
export * from './subscription.constants'
export * from './subscription.types'
