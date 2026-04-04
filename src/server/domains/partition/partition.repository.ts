import { db } from '@/server/lib/database'

import type {
  CreatePartitionDTO,
  PartitionListFilters,
  PartitionSummary,
  SavedPartitionEntity,
  UpdatePartitionDTO,
} from './partition.types'

const SUMMARY_SELECT = {
  id: true,
  userId: true,
  title: true,
  originalFileName: true,
  instrument: true,
  partitionType: true,
  tags: true,
  notes: true,
  sourceJobId: true,
  durationSeconds: true,
  createdAt: true,
  updatedAt: true,
} as const

export class PartitionRepository {
  async findAllByUserId(
    userId: string,
    filters: PartitionListFilters = {},
  ): Promise<PartitionSummary[]> {
    const { instrument, search, page = 1, limit = 20 } = filters

    return db.savedPartition.findMany({
      where: {
        userId,
        ...(instrument && { instrument }),
        ...(search && {
          title: { contains: search, mode: 'insensitive' as const },
        }),
      },
      select: SUMMARY_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }) as unknown as PartitionSummary[]
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<SavedPartitionEntity | null> {
    return db.savedPartition.findFirst({
      where: { id, userId },
    })
  }

  async findSvgByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<{ svgContent: string | null; musicXmlContent: string } | null> {
    return db.savedPartition.findFirst({
      where: { id, userId },
      select: { svgContent: true, musicXmlContent: true },
    })
  }

  async create(data: CreatePartitionDTO): Promise<SavedPartitionEntity> {
    return db.savedPartition.create({
      data: {
        userId: data.userId,
        title: data.title,
        originalFileName: data.originalFileName,
        instrument: data.instrument,
        partitionType: data.partitionType,
        tags: data.tags ?? [],
        notes: data.notes,
        transcribeConfig: data.transcribeConfig as object,
        musicXmlContent: data.musicXmlContent,
        svgContent: data.svgContent,
        sourceJobId: data.sourceJobId,
        durationSeconds: data.durationSeconds,
      },
    })
  }

  async update(
    id: string,
    userId: string,
    data: UpdatePartitionDTO,
  ): Promise<SavedPartitionEntity | null> {
    const existing = await this.findByIdAndUserId(id, userId)
    if (!existing) return null

    return db.savedPartition.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })
  }

  async updateSvg(id: string, svgContent: string): Promise<void> {
    await db.savedPartition.update({
      where: { id },
      data: { svgContent },
    })
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await this.findByIdAndUserId(id, userId)
    if (!existing) return false

    await db.savedPartition.delete({ where: { id } })
    return true
  }

  async existsByJobIdAndUserId(
    jobId: string,
    userId: string,
  ): Promise<boolean> {
    const count = await db.savedPartition.count({
      where: { sourceJobId: jobId, userId },
    })
    return count > 0
  }
}
