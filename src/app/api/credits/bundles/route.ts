import { creditController } from '@/server/domains/credit'

export async function GET() {
  return creditController.getBundles()
}
