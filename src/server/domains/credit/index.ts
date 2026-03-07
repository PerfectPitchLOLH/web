import { CreditController } from './credit.controller'
import { CreditRepository } from './credit.repository'
import { CreditService } from './credit.service'

const creditRepository = new CreditRepository()
const creditService = new CreditService(creditRepository)

let creditController: CreditController

export function initializeCreditController(
  paymentService: any,
): CreditController {
  if (!creditController) {
    creditController = new CreditController(creditService, paymentService)
  }
  return creditController
}

creditController = new CreditController(creditService)

export { creditController, creditRepository, creditService }
export * from './credit.constants'
export * from './credit.types'
