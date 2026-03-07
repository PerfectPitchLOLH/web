import { subscriptionRepository } from '../subscription'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'

const paymentService = new PaymentService(subscriptionRepository)
export const paymentController = new PaymentController(paymentService)

export { paymentService }
export * from './payment.types'
