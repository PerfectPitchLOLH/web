import { ContactController } from './contact.controller'
import { ContactService } from './contact.service'

const contactService = new ContactService()
export const contactController = new ContactController(contactService)

export * from './contact.constants'
export * from './contact.types'
