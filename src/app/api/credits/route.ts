import { NextRequest } from 'next/server'

import { creditController } from '@/server/domains/credit'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'
import { createSuccessResponse } from '@/server/shared/utils/api.utils'

export async function GET(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response

  const { session } = auth

  if (session.devMode?.isActive) {
    const monthlyCreditsInSeconds = session.devMode.credits.monthly * 60
    const bonusCreditsInSeconds = session.devMode.credits.bonus * 60
    const totalCreditsInSeconds =
      monthlyCreditsInSeconds + bonusCreditsInSeconds

    return createSuccessResponse({
      monthlyCredits: monthlyCreditsInSeconds,
      bonusCredits: bonusCreditsInSeconds,
      totalCredits: totalCreditsInSeconds,
      usedThisMonth: 0,
      remainingCredits: totalCreditsInSeconds,
      lastMonthlyRefill: new Date().toISOString(),
      alerts: {
        lowBalance: totalCreditsInSeconds < 10 * 60,
        outOfCredits: totalCreditsInSeconds === 0,
      },
    })
  }

  return creditController.getUserCredits(session.user.id)
}
