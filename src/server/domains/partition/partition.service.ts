import { db } from '@/server/lib/database'
import {
  ERROR_CODES,
  HTTP_STATUS,
} from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { PartitionRepository } from './partition.repository'
import type {
  PartitionListFilters,
  PartitionSummary,
  SavedPartitionEntity,
  SavePartitionInput,
  UpdatePartitionDTO,
} from './partition.types'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export class PartitionService {
  constructor(private repository: PartitionRepository) {}

  async saveFromJob(
    userId: string,
    input: SavePartitionInput,
  ): Promise<PartitionSummary> {
    const existing = await this.repository.findByJobIdAndUserId(
      input.jobId,
      userId,
    )
    if (existing) {
      throw new ApiError(
        ERROR_CODES.PARTITION_ALREADY_SAVED,
        HTTP_STATUS.CONFLICT,
        'Partition already saved',
        { id: existing.id },
      )
    }

    const jobOwnerRecord = await db.transcriptionJob.findUnique({
      where: { backendJobId: input.jobId },
      select: { userId: true, musicXmlContent: true, svgContent: true },
    })
    if (!jobOwnerRecord || jobOwnerRecord.userId !== userId) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        HTTP_STATUS.FORBIDDEN,
        'Access denied',
      )
    }

    const jobRes = await fetch(`${API_BASE_URL}/jobs/${input.jobId}`)
    if (!jobRes.ok) {
      throw new ApiError(
        ERROR_CODES.NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        'Job not found',
      )
    }
    const job = await jobRes.json()

    if (job.status !== 'completed') {
      throw new ApiError(
        ERROR_CODES.JOB_NOT_COMPLETED,
        HTTP_STATUS.BAD_REQUEST,
        'Job is not completed',
      )
    }

    const musicXmlContent = jobOwnerRecord.musicXmlContent ?? undefined
    let svgContent: string | undefined = jobOwnerRecord.svgContent ?? undefined

    if (!svgContent) {
      try {
        const svgRes = await fetch(
          `${API_BASE_URL}/jobs/${input.jobId}/download/partition`,
        )
        if (svgRes.ok) svgContent = await svgRes.text()
      } catch {}
    }

    if (!svgContent) {
      throw new ApiError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        'Partition content unavailable',
      )
    }

    const config = job.config || {}
    const instrument = config.instrument_type || 'other'
    const partitionType = config.partition_type || 'classique'

    const entity = await this.repository.create({
      userId,
      title: input.title,
      originalFileName: input.originalFileName,
      instrument,
      partitionType,
      tags: input.tags ?? [],
      notes: input.notes,
      transcribeConfig: config,
      musicXmlContent,
      svgContent,
      sourceJobId: input.jobId,
      durationSeconds: job.results?.duration_seconds,
    })

    const {
      musicXmlContent: _xml,
      svgContent: _svg,
      transcribeConfig: _cfg,
      ...summary
    } = entity
    return summary as PartitionSummary
  }

  async getList(
    userId: string,
    filters: PartitionListFilters,
  ): Promise<PartitionSummary[]> {
    return this.repository.findAllByUserId(userId, filters)
  }

  async getById(id: string, userId: string): Promise<SavedPartitionEntity> {
    const partition = await this.repository.findByIdAndUserId(id, userId)
    if (!partition) {
      throw new ApiError(ERROR_CODES.PARTITION_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return partition
  }

  async getSvg(id: string, userId: string): Promise<string> {
    const data = await this.repository.findSvgByIdAndUserId(id, userId)
    if (!data) {
      throw new ApiError(ERROR_CODES.PARTITION_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    this.repository.touchLastOpened(id).catch(() => {})

    if (data.svgContent) {
      return data.svgContent
    }

    const renderRes = await fetch(`${API_BASE_URL}/render/svg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: data.musicXmlContent,
    })

    if (!renderRes.ok) {
      throw new ApiError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
      )
    }

    const svg = await renderRes.text()

    this.repository.updateSvg(id, svg).catch(() => {})

    return svg
  }

  async getMusicXml(id: string, userId: string): Promise<string> {
    const partition = await this.repository.findByIdAndUserId(id, userId)
    if (!partition) {
      throw new ApiError(ERROR_CODES.PARTITION_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    if (!partition.musicXmlContent) {
      throw new ApiError(
        ERROR_CODES.MUSICXML_UNAVAILABLE,
        HTTP_STATUS.NOT_FOUND,
        'MusicXML not available for this partition',
      )
    }
    return partition.musicXmlContent
  }

  async update(
    id: string,
    userId: string,
    data: UpdatePartitionDTO,
  ): Promise<SavedPartitionEntity> {
    const updated = await this.repository.update(id, userId, data)
    if (!updated) {
      throw new ApiError(ERROR_CODES.PARTITION_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return updated
  }

  async delete(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.delete(id, userId)
    if (!deleted) {
      throw new ApiError(ERROR_CODES.PARTITION_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
  }

  async getLastOpened(userId: string): Promise<PartitionSummary | null> {
    return this.repository.findLastOpened(userId)
  }

  async findSimilarByTitle(
    userId: string,
    title: string,
  ): Promise<{ id: string; title: string }[]> {
    if (title.trim().length < 3) return []
    return this.repository.findSimilarByTitle(userId, title.trim())
  }
}
