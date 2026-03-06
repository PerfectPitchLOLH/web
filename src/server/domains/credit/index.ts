import { CreditController } from './credit.controller'
import { CreditRepository } from './credit.repository'
import { CreditService } from './credit.service'

const creditRepository = new CreditRepository()
const creditService = new CreditService(creditRepository)
export const creditController = new CreditController(creditService)

export * from './credit.constants'
export * from './credit.types'
