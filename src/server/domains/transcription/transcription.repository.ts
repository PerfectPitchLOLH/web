import { db } from '@/server/lib/database'

import type {
  ConfigValidationResponse,
  HealthStatus,
  JobDetails,
  TranscribeConfig,
  TranscribeResponse,
} from './transcription.types'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export class TranscriptionRepository {
  private async callBackendAPI<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(url, {
        ...options,
        signal: options?.signal ?? controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail ||
            `HTTP error ${response.status}: ${response.statusText}`,
        )
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Backend API call failed: ${error.message}`)
      }
      throw new Error('Backend API call failed with unknown error')
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async uploadAudio(
    file: File,
    config: TranscribeConfig,
  ): Promise<TranscribeResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('config', JSON.stringify(config))

    const url = `${API_BASE_URL}/transcribe`

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || `Upload failed: ${response.statusText}`,
        )
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Audio upload failed: ${error.message}`)
      }
      throw new Error('Audio upload failed with unknown error')
    }
  }

  async uploadFromYoutubeUrl(
    url: string,
    config: TranscribeConfig,
  ): Promise<TranscribeResponse> {
    const backendUrl = `${API_BASE_URL}/transcribe/youtube`

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, config }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || `YouTube upload failed: ${response.statusText}`,
        )
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`YouTube upload failed: ${error.message}`)
      }
      throw new Error('YouTube upload failed with unknown error')
    }
  }

  async uploadFromSpotifyUrl(
    url: string,
    config: TranscribeConfig,
  ): Promise<TranscribeResponse> {
    const backendUrl = `${API_BASE_URL}/transcribe/spotify`

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, config }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || `Spotify upload failed: ${response.statusText}`,
        )
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Spotify upload failed: ${error.message}`)
      }
      throw new Error('Spotify upload failed with unknown error')
    }
  }

  async getJobStatus(jobId: string): Promise<JobDetails> {
    const response = await this.callBackendAPI<any>(`/jobs/${jobId}`)

    let musicxmlUrl: string | undefined
    let partitionUrl: string | undefined

    if (response.results) {
      partitionUrl =
        response.results.partition_url || response.results.partition_svg_url

      if (partitionUrl) {
        response.results.partition_svg_url = `/api/transcription/${jobId}/download`
      }

      delete response.results.partition_url
      delete response.results.musicxml_url
    }

    if (response.status === 'completed') {
      const existing = await db.transcriptionJob.findUnique({
        where: { backendJobId: jobId },
        select: { svgContent: true },
      })
      if (!existing?.svgContent) {
        await this.cacheJobContent(jobId, partitionUrl)
      }
    }

    return response as JobDetails
  }

  private async cacheJobContent(
    jobId: string,
    partitionUrl?: string,
  ): Promise<void> {
    let svgContent: string | undefined

    const resolveUrl = (url: string) =>
      url.startsWith('http')
        ? url
        : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`

    const svgUrls = [
      partitionUrl && resolveUrl(partitionUrl),
      `${API_BASE_URL}/jobs/${jobId}/download/partition`,
    ].filter(Boolean) as string[]

    for (const url of svgUrls) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          svgContent = await res.text()
          break
        }
      } catch {}
    }

    if (svgContent) {
      await db.transcriptionJob.update({
        where: { backendJobId: jobId },
        data: { svgContent },
      })
    }
  }

  async downloadPartition(jobId: string): Promise<Blob> {
    const url = `${API_BASE_URL}/jobs/${jobId}/download/partition`

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      return response.blob()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Partition download failed: ${error.message}`)
      }
      throw new Error('Partition download failed with unknown error')
    }
  }

  async validateConfig(
    config: TranscribeConfig,
  ): Promise<ConfigValidationResponse> {
    return this.callBackendAPI<ConfigValidationResponse>('/config/validate', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  async cancelJob(jobId: string): Promise<void> {
    const url = `${API_BASE_URL}/jobs/${jobId}`
    try {
      const response = await fetch(url, { method: 'DELETE' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || `Cancel failed: ${response.statusText}`,
        )
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Job cancellation failed: ${error.message}`)
      }
      throw new Error('Job cancellation failed with unknown error')
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    return this.callBackendAPI<HealthStatus>('/health')
  }

  async getYoutubeInfo(
    url: string,
  ): Promise<{ duration_seconds: number; title: string }> {
    const backendUrl = `${API_BASE_URL}/transcribe/youtube/info?url=${encodeURIComponent(url)}`
    const response = await fetch(backendUrl)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Could not fetch YouTube info')
    }
    return response.json()
  }

  async atomicDeductCredits(
    backendJobId: string,
    userId: string,
    durationSeconds: number,
    description: string,
  ): Promise<'deducted' | 'already_deducted' | 'insufficient'> {
    try {
      await db.$transaction(async (tx) => {
        const flagged = await tx.transcriptionJob.updateMany({
          where: { backendJobId, creditsDeducted: false },
          data: { creditsDeducted: true, durationSeconds },
        })
        if (flagged.count === 0) throw new Error('ALREADY_DEDUCTED')

        const credits = await tx.userCredits.findUnique({ where: { userId } })
        if (!credits) throw new Error('CREDITS_NOT_FOUND')

        const toDeduct = Math.min(
          durationSeconds,
          credits.monthlyCredits + credits.bonusCredits,
        )
        if (toDeduct <= 0) throw new Error('INSUFFICIENT_CREDITS')

        let remaining = toDeduct
        const newMonthly =
          credits.monthlyCredits >= remaining
            ? credits.monthlyCredits - remaining
            : ((remaining -= credits.monthlyCredits), 0)
        const newBonus =
          credits.monthlyCredits >= toDeduct
            ? credits.bonusCredits
            : credits.bonusCredits - remaining

        const newBalance = newMonthly + newBonus
        await tx.userCredits.update({
          where: { userId },
          data: {
            monthlyCredits: newMonthly,
            bonusCredits: newBonus,
            usedThisMonth: { increment: toDeduct },
          },
        })

        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'usage',
            amount: -Math.ceil(toDeduct / 60),
            balanceAfter: Math.floor(newBalance / 60),
            description,
          },
        })
      })
      return 'deducted'
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'ALREADY_DEDUCTED') return 'already_deducted'
        if (err.message === 'INSUFFICIENT_CREDITS') return 'insufficient'
      }
      throw err
    }
  }

  async saveJobOwner(
    backendJobId: string,
    userId: string,
    estimatedDurationSeconds?: number,
  ): Promise<void> {
    await db.transcriptionJob.upsert({
      where: { backendJobId },
      create: { backendJobId, userId, estimatedDurationSeconds },
      update: {},
    })
  }

  async verifyJobOwner(backendJobId: string, userId: string): Promise<boolean> {
    const job = await db.transcriptionJob.findUnique({
      where: { backendJobId },
    })
    return job?.userId === userId
  }
}
