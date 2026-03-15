import { creditService } from '../credit'
import { CreditPurchaseRepository } from './credit-purchase.repository'
import { CreditPurchaseService } from './credit-purchase.service'

const creditPurchaseRepository = new CreditPurchaseRepository()
const creditPurchaseService = new CreditPurchaseService(
  creditPurchaseRepository,
  creditService,
)

export { creditPurchaseRepository, creditPurchaseService }
export * from './credit-purchase.types'
