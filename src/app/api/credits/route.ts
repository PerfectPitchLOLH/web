import { creditController } from '@/server/domains/credit'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/server/shared/utils/api.utils'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  if (session.devMode?.isActive) {
    const monthlyCreditsInSeconds = session.devMode.credits.monthly * 60
    const bonusCreditsInSeconds = session.devMode.credits.bonus * 60
    const totalCreditsInSeconds =
      monthlyCreditsInSeconds + bonusCreditsInSeconds

    const mockCredits = {
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
    }

    return createSuccessResponse(mockCredits, HTTP_STATUS.OK)
  }

  return creditController.getUserCredits(session.user.id)
}
