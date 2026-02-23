import { UserController } from './user.controller'
import { UserRepository } from './user.repository'
import { UserService } from './user.service'

const userRepository = new UserRepository()
const userService = new UserService(userRepository)
export const userController = new UserController(userService)

export * from './user.types'
export { UserController, UserRepository, UserService }
