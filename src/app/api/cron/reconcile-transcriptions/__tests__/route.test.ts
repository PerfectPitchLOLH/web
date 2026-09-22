import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const reconcileActiveJobs = vi.hoisted(() => vi.fn())

vi.mock('@/server/domains/transcription', () => ({
  transcriptionController: { reconcileActiveJobs },
}))

import { GET } from '../route'

const makeRequest = (authorization?: string) =>
  new NextRequest('http://localhost/api/cron/reconcile-transcriptions', {
    headers: authorization ? { authorization } : {},
  })

describe('GET /api/cron/reconcile-transcriptions', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'cron-secret-for-tests'
    reconcileActiveJobs.mockResolvedValue(
      NextResponse.json({ success: true, data: { scanned: 0, failed: 0 } }),
    )
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret
  })

  it('answers 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(makeRequest('Bearer undefined'))

    expect(res.status).toBe(500)
    expect(reconcileActiveJobs).not.toHaveBeenCalled()
  })

  it('answers 401 without an authorization header', async () => {
    const res = await GET(makeRequest())

    expect(res.status).toBe(401)
    expect(reconcileActiveJobs).not.toHaveBeenCalled()
  })

  it('answers 401 with a wrong secret', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret-for-tests'))

    expect(res.status).toBe(401)
    expect(reconcileActiveJobs).not.toHaveBeenCalled()
  })

  it('answers 401 with a secret of a different length', async () => {
    const res = await GET(makeRequest('Bearer short'))

    expect(res.status).toBe(401)
  })

  it('runs the reconciliation with the right secret', async () => {
    const res = await GET(makeRequest('Bearer cron-secret-for-tests'))

    expect(res.status).toBe(200)
    expect(reconcileActiveJobs).toHaveBeenCalledTimes(1)
  })
})
