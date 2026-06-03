import { NextRequest, NextResponse } from 'next/server'

import { permissionService } from '@/server/domains/permission'
import { ACTIVE_SUBSCRIPTION_STATUSES } from '@/server/domains/permission'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

export async function requireActiveSubscription(
  _request: NextRequest,
): Promise<NextResponse | null> {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json(
      createErrorResponse(
        'UNAUTHORIZED',
        'Non authentifié',
        undefined,
        HTTP_STATUS.UNAUTHORIZED,
      ),
      { status: HTTP_STATUS.UNAUTHORIZED },
    )
  }

  const context = await permissionService.getUserPermissionContext(
    session.user.id,
  )

  if (
    !context.subscriptionStatus ||
    !ACTIVE_SUBSCRIPTION_STATUSES.includes(context.subscriptionStatus as any)
  ) {
    return NextResponse.json(
      createErrorResponse(
        'NO_ACTIVE_SUBSCRIPTION',
        'Un abonnement actif est requis pour accéder à cette fonctionnalité',
        { currentStatus: context.subscriptionStatus },
        HTTP_STATUS.PAYMENT_REQUIRED,
      ),
      { status: HTTP_STATUS.PAYMENT_REQUIRED },
    )
  }

  return null
}
