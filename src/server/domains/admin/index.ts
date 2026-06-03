import { AdminController } from './admin.controller'
import { AdminRepository } from './admin.repository'
import { AdminService } from './admin.service'

export const adminRepository = new AdminRepository()
export const adminService = new AdminService(adminRepository)
export const adminController = new AdminController(adminService)

export * from './admin.schemas'
export * from './admin.types'
