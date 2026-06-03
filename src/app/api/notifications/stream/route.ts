import { NextRequest } from 'next/server'

import { notificationService } from '@/server/domains/notification'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

const clients = new Map<string, ReadableStreamDefaultController>()

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  const userId = session.user.id

  const stream = new ReadableStream({
    start(controller) {
      clients.set(userId, controller)

      const encoder = new TextEncoder()

      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      sendEvent({ type: 'connected' })

      const interval = setInterval(async () => {
        try {
          const unreadCount = await notificationService.getUnreadCount(userId)
          sendEvent({ type: 'unread-count', count: unreadCount })
        } catch {
          // Ignore error
        }
      }, 30000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        clients.delete(userId)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export function notifyUser(userId: string, notification: any) {
  const controller = clients.get(userId)
  if (controller) {
    const encoder = new TextEncoder()
    try {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'new-notification', notification })}\n\n`,
        ),
      )
    } catch {
      clients.delete(userId)
    }
  }
}
