import type { NextRequest } from 'next/server'

import { contactController } from '@/server/domains/contact'

export async function POST(request: NextRequest) {
  return contactController.submit(request)
}
