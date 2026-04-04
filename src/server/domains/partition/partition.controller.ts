import type { NextRequest } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import type { PartitionService } from './partition.service'
import type { SavePartitionInput, UpdatePartitionDTO } from './partition.types'

export class PartitionController {
  constructor(private service: PartitionService) {}

  async list(userId: string, request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url)
      const filters = {
        instrument: searchParams.get('instrument') || undefined,
        search: searchParams.get('search') || undefined,
        page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
        limit: searchParams.get('limit')
          ? Number(searchParams.get('limit'))
          : 20,
      }
      const data = await this.service.getList(userId, filters)
      return createSuccessResponse(data)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async save(userId: string, request: NextRequest) {
    try {
      const body = (await request.json()) as SavePartitionInput
      const data = await this.service.saveFromJob(userId, body)
      return createSuccessResponse(data, HTTP_STATUS.CREATED)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getOne(userId: string, id: string) {
    try {
      const data = await this.service.getById(id, userId)
      const {
        musicXmlContent: _xml,
        svgContent: _svg,
        transcribeConfig: _cfg,
        ...summary
      } = data
      return createSuccessResponse(summary)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async patch(userId: string, id: string, request: NextRequest) {
    try {
      const body = (await request.json()) as UpdatePartitionDTO
      const data = await this.service.update(id, userId, body)
      const {
        musicXmlContent: _xml,
        svgContent: _svg,
        transcribeConfig: _cfg,
        ...summary
      } = data
      return createSuccessResponse(summary)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async remove(userId: string, id: string) {
    try {
      await this.service.delete(id, userId)
      return new Response(null, { status: 204 })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async svg(userId: string, id: string) {
    try {
      const svgContent = await this.service.getSvg(id, userId)
      return new Response(svgContent, {
        headers: { 'Content-Type': 'image/svg+xml' },
      })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async musicXml(userId: string, id: string) {
    try {
      const xmlContent = await this.service.getMusicXml(id, userId)
      return new Response(xmlContent, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="partition_${id}.musicxml"`,
        },
      })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
