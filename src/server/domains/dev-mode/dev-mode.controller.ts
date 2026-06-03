import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import { DEV_MODE_COOKIE_NAME } from './dev-mode.constants'
import { DevModeService } from './dev-mode.service'
import type { ActivateDevModeDTO } from './dev-mode.types'

export class DevModeController {
  constructor(private service: DevModeService) {}

  async activate(request: NextRequest, userRole: string) {
    try {
      this.service.validateAdminRole(userRole)

      const body = (await request.json()) as ActivateDevModeDTO
      const config = this.service.createConfig(body)

      const cookieStore = await cookies()
      cookieStore.set({
        name: DEV_MODE_COOKIE_NAME,
        value: JSON.stringify(config),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      })

      return createSuccessResponse({ config }, HTTP_STATUS.OK)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async deactivate(_request: NextRequest, userRole: string) {
    try {
      this.service.validateAdminRole(userRole)

      const cookieStore = await cookies()
      cookieStore.delete(DEV_MODE_COOKIE_NAME)

      return createSuccessResponse(
        { config: this.service.deactivateDevMode() },
        HTTP_STATUS.OK,
      )
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getStatus(_request: NextRequest, userRole: string) {
    try {
      this.service.validateAdminRole(userRole)

      const cookieStore = await cookies()
      const configCookie = cookieStore.get(DEV_MODE_COOKIE_NAME)

      if (!configCookie) {
        return createSuccessResponse({
          config: this.service.deactivateDevMode(),
        })
      }

      const config = JSON.parse(configCookie.value)

      return createSuccessResponse({ config })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
