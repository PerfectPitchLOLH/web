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

    try {
      const response = await fetch(url, {
        ...options,
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

  async getJobStatus(jobId: string): Promise<JobDetails> {
    const response = await this.callBackendAPI<any>(`/jobs/${jobId}`)

    if (response.results) {
      if (
        response.results.partition_url ||
        response.results.partition_svg_url
      ) {
        response.results.partition_svg_url = `/api/transcription/${jobId}/download`
      }

      delete response.results.partition_url
      delete response.results.musicxml_url
    }

    return response as JobDetails
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

  async saveJobOwner(backendJobId: string, userId: string): Promise<void> {
    await db.transcriptionJob.upsert({
      where: { backendJobId },
      create: { backendJobId, userId },
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
